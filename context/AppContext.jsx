'use client'
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { productsApi } from "@/lib/api/products";
import { authApi } from "@/lib/api/auth";
import { mapProducts } from "@/lib/transformers";
import { computeCart, findPromo } from "@/lib/cart";
import { promoApi } from "@/lib/api/admin-promotions";

export const AppContext = createContext();

export const useAppContext = () => {
    return useContext(AppContext)
}

export const AppContextProvider = (props) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY || 'DA'
    const router = useRouter()

    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [brands, setBrands] = useState([])
    const [userData, setUserData] = useState(null)
    const [isSeller, setIsSeller] = useState(false)
    const [token, setToken] = useState(false)
    const [cartItems, setCartItems] = useState({})
    const [promo, setPromo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchProductData = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await productsApi.getAll()
            setProducts(mapProducts(data.results))
        } catch (err) {
            console.error('Failed to fetch products:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const data = await productsApi.getCategories({ page_size: 100 })
            setCategories(data.results ? data.results : [])
        } catch (err) {
            console.error('Failed to fetch categories:', err)
        }
    }

    const fetchBrands = async () => {
        try {
            const data = await productsApi.getBrands({ page_size: 100 })
            setBrands(data.results ? data.results : [])
        } catch (err) {
            console.error('Failed to fetch brands:', err)
        }
    }

    const fetchUserData = async (overrideToken) => {
        const authToken = overrideToken || token
        if (!authToken) {
            setUserData(null)
            return null
        }

        try {
            const data = await authApi.getProfile(authToken)
            setUserData(data)
            setIsSeller(data.role === 'seller' || data.is_seller)
            return data
        } catch (err) {
            console.error('Failed to fetch user data:', err)
            setUserData(null)
            setIsSeller(false)
            return null
        }
    }

    const login = async (email, password) => {
        try {
            const data = await authApi.login(email, password)
            setToken(data.access)
            localStorage.setItem('access_token', data.access)
            localStorage.setItem('refresh_token', data.refresh)
            const user = await fetchUserData(data.access)
            return { success: true, user }
        } catch (err) {
            console.error('Login failed:', err)
            return { success: false, error: err.message }
        }
    }

    const register = async (userData) => {
        try {
            const data = await authApi.register(userData)
            setToken(data.access)
            localStorage.setItem('access_token', data.access)
            localStorage.setItem('refresh_token', data.refresh)
            await fetchUserData()
            return { success: true }
        } catch (err) {
            console.error('Registration failed:', err)
            return { success: false, error: err.message }
        }
    }

    const logout = () => {
        setToken(false)
        setUserData(null)
        setIsSeller(false)
        setCartItems({})
        setPromo(null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('cart_items')
        localStorage.removeItem('cart_promo')
        router.push('/')
    }

    const addToCart = async (itemId) => {
        let cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId] += 1;
        } else {
            cartData[itemId] = 1;
        }
        setCartItems(cartData);
    }

    const updateCartQuantity = async (itemId, quantity) => {
        let cartData = structuredClone(cartItems);
        if (quantity === 0) {
            delete cartData[itemId];
        } else {
            cartData[itemId] = quantity;
        }
        setCartItems(cartData)
    }

    const getCartCount = () => {
        let totalCount = 0;
        for (const items in cartItems) {
            if (cartItems[items] > 0) {
                totalCount += cartItems[items];
            }
        }
        return totalCount;
    }

    const getCartAmount = () => {
        let totalAmount = 0;
        for (const items in cartItems) {
            let itemInfo = products.find((product) => product._id === items);
            if (cartItems[items] > 0 && itemInfo) {
                totalAmount += itemInfo.offerPrice * cartItems[items];
            }
        }
        return Math.floor(totalAmount * 100) / 100;
    }

    /** Empty the cart entirely (clears items + any applied promo). */
    const clearCart = () => {
        setCartItems({});
        setPromo(null);
    }

    /** Apply a promo code via server-side validation. Returns { ok, message }. */
    const applyPromo = async (code) => {
        const subtotal = getCartAmount();
        try {
            const result = await promoApi.validate(code, subtotal);
            if (result.valid) {
                setPromo(result);
                return { ok: true, message: `Code ${result.code} appliqué` };
            }
            return { ok: false, message: result.error || 'Code promo invalide' };
        } catch (err) {
            return { ok: false, message: err.message || 'Erreur validation code promo' };
        }
    }

    /** Remove the currently applied promo code. */
    const removePromo = () => {
        setPromo(null);
    }

    /** Full cart summary (items, subtotal, discount, VAT, shipping, total). */
    const getCartSummary = () => {
        return computeCart({ cartItems, products, promo: promo ? findPromo(promo.code) : null });
    }

    // Check for stored token and cart on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('access_token')
        if (storedToken) {
            setToken(storedToken)
        }
        const storedCart = localStorage.getItem('cart_items')
        if (storedCart) {
            try {
                setCartItems(JSON.parse(storedCart))
            } catch (e) {}
        }
        const storedPromo = localStorage.getItem('cart_promo')
        if (storedPromo) {
            try {
                setPromo(findPromo(JSON.parse(storedPromo).code))
            } catch (e) {}
        }
    }, [])

    // Persist cart to localStorage on change
    useEffect(() => {
        localStorage.setItem('cart_items', JSON.stringify(cartItems))
    }, [cartItems])

    // Persist promo code to localStorage
    useEffect(() => {
        if (promo) {
            localStorage.setItem('cart_promo', JSON.stringify(promo))
        } else {
            localStorage.removeItem('cart_promo')
        }
    }, [promo])

    useEffect(() => {
        fetchProductData()
        fetchCategories()
        fetchBrands()
    }, [])

    useEffect(() => {
        fetchUserData()
    }, [token])

    const value = {
        currency, router,
        isSeller, setIsSeller,
        userData,
        user: userData,
        fetchUserData,
        products, fetchProductData,
        categories, brands,
        cartItems, setCartItems,
        addToCart, updateCartQuantity, clearCart,
        getCartCount, getCartAmount, getCartSummary,
        promo, applyPromo, removePromo,
        token, setToken, login, register, logout,
        loading, error
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}
