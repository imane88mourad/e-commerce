"""
Management command to seed the complete IT & Furniture catalog.
Run: cd backend && source venv/bin/activate && python manage.py seed_catalog
"""
from django.core.management.base import BaseCommand
from apps.products.models import (
    Category, Brand, Product, ProductImage, Attribute, AttributeValue, ProductVariant
)
from apps.users.models import User


class Command(BaseCommand):
    help = 'Seed the IT & Furniture product catalog'

    def handle(self, *args, **options):
        self.stdout.write('Seeding catalog...')

        # Get the seller user
        user, _ = User.objects.get_or_create(
            username='seller',
            defaults={'email': 'seller@quickcart.com', 'role': 'seller'}
        )

        # ── CATEGORIES ──────────────────────────────────────────────
        cats = {}
        categories_data = [
            ('PC & Serveurs', 'pc-serveurs', [
                ('PC de Bureau', 'pc-de-bureau'),
                ('PC Portable', 'pc-portable'),
                ('Serveurs', 'serveurs'),
                ('Stations de Travail', 'stations-de-travail'),
            ]),
            ('Composants', 'composants', [
                ('Processeurs', 'processeurs'),
                ('Cartes Mères', 'cartes-meres'),
                ('Mémoire RAM', 'memoire-ram'),
                ('Stockage', 'stockage'),
                ('Cartes Graphiques', 'cartes-graphiques'),
                ('Alimentations', 'alimentations'),
                ('Boîtiers', 'boitiers'),
                ('Refroidissement', 'refroidissement'),
            ]),
            ('Écrans & Affichage', 'ecrans-affichage', [
                ('Moniteurs', 'moniteurs'),
                ('Vidéoprojecteurs', 'videoprojecteurs'),
                ('Téléviseurs Professionnels', 'televiseurs-pro'),
            ]),
            ('Imprimantes & Scanners', 'imprimantes-scanners', [
                ('Imprimantes Laser', 'imprimantes-laser'),
                ('Imprimantes Jet d\'Encre', 'imprimantes-jet-encre'),
                ('Imprimantes Grand Format', 'imprimantes-grand-format'),
                ('Scanners', 'scanners'),
                ('Multifonctions', 'multifonctions'),
                ('Consommables', 'consommables'),
            ]),
            ('Réseau & Télécommunications', 'reseau-telecom', [
                ('Routeurs', 'routeurs'),
                ('Commutateurs', 'commutateurs'),
                ('Points d\'Accès WiFi', 'points-acces-wifi'),
                ('Pare-feu', 'pare-feu'),
                ('Câblage Structuré', 'cblage-structure'),
                ('Baies de Réseau', 'baies-reseau'),
                ('Onduleurs', 'onduleurs'),
            ]),
            ('Périphériques', 'peripheriques', [
                ('Claviers', 'claviers'),
                ('Souris', 'souris'),
                ('Lecteurs Blu-ray', 'lecteurs-blu-ray'),
                ('Webcams', 'webcams'),
                ('Casques & Micros', 'casques-micros'),
                ('Enceintes', 'enceintes'),
                ('Stockage Externe', 'stockage-externe'),
            ]),
            ('Mobilier Professionnel', 'mobilier-pro', [
                ('Chaises de Bureau', 'chaises-bureau'),
                ('Bureaux', 'bureaux'),
                ('Armoires & Rangement', 'armoires-rangement'),
                ('Meubles Serveur', 'meubles-serveur'),
                ('Écrans & Accessoires', 'ecrans-accessoires-mobilier'),
            ]),
            ('Solutions Professionnelles', 'solutions-pro', [
                ('Coffrets & Armoires Informatiques', 'coffrets-armoires-info'),
                ('Onduleurs Pro', 'onduleurs-pro'),
                ('Câblage & Raccordement', 'cblage-raccordement'),
                ('Équipement Réseau Pro', 'equipement-reseau-pro'),
            ]),
        ]

        for parent_name, parent_slug, children in categories_data:
            parent, _ = Category.objects.get_or_create(
                slug=parent_slug,
                defaults={'name': parent_name, 'description': f'Catégorie {parent_name}'}
            )
            cats[parent_slug] = parent
            for child_name, child_slug in children:
                child, _ = Category.objects.get_or_create(
                    slug=child_slug,
                    defaults={
                        'name': child_name,
                        'description': f'Catégorie {child_name}',
                        'parent': parent
                    }
                )
                cats[child_slug] = child

        self.stdout.write(self.style.SUCCESS(f'  Created {len(cats)} categories'))

        # ── BRANDS ──────────────────────────────────────────────────
        brands = {}
        brands_data = [
            ('Dell', 'dell'), ('HP', 'hp'), ('Lenovo', 'lenovo'),
            ('Asus', 'asus'), ('Acer', 'acer'), ('Apple', 'apple'),
            ('Samsung', 'samsung'), ('LG', 'lg'), ('Canon', 'canon'),
            ('Epson', 'epson'), ('Brother', 'brother'),
            ('Cisco', 'cisco'), ('Ubiquiti', 'ubiquiti'), ('TP-Link', 'tp-link'),
            ('APC', 'apc'), ('Eaton', 'eaton'),
            ('Logitech', 'logitech'), ('Razer', 'razer'),
            ('Kingston', 'kingston'), ('Crucial', 'crucial'), ('Samsung Memory', 'samsung-memory'),
            ('NVIDIA', 'nvidia'), ('AMD', 'amd'), ('Intel', 'intel'),
            ('Western Digital', 'western-digital'), ('Seagate', 'seagate'),
            ('MSI', 'msi'), ('Gigabyte', 'gigabyte'), ('ASRock', 'asrock'),
            ('Thermaltake', 'thermaltake'), ('Corsair', 'corsair'),
            ('Noctua', 'noctua'), ('Be Quiet', 'be-quiet'),
            ('Herman Miller', 'herman-miller'), ('Secretlab', 'secretlab'),
            ('Humanscale', 'humanscale'),
            ('Vertiv', 'vertiv'), ('Tripp Lite', 'tripp-lite'),
        ]
        for brand_name, brand_slug in brands_data:
            brand, _ = Brand.objects.get_or_create(
                slug=brand_slug,
                defaults={'name': brand_name}
            )
            brands[brand_slug] = brand

        self.stdout.write(self.style.SUCCESS(f'  Created {len(brands)} brands'))

        # ── PRODUCTS ────────────────────────────────────────────────
        products_data = [
            # PC de Bureau
            {
                'name': 'Dell OptiPlex 7010 SFF',
                'slug': 'dell-optiplex-7010-sff',
                'sku': 'DELL-OP7010-SFF',
                'category': 'pc-de-bureau', 'brand': 'dell',
                'price': 45000, 'promotional_price': 39900,
                'stock': 25, 'is_featured': True, 'is_best_seller': True,
                'description': 'PC de bureau Dell OptiPlex 7010 Small Form Factor. Processeur Intel Core i5-13500, 16 Go DDR5, SSD 512 Go. Idéal pour les professionnels.',
                'short_description': 'Intel Core i5-13500, 16 Go, 512 Go SSD',
                'attributes': {'processeur': 'Intel Core i5-13500', 'ram': '16 Go DDR5', 'stockage': '512 Go SSD', 'os': 'Windows 11 Pro'},
            },
            {
                'name': 'HP ProDesk 400 G9',
                'slug': 'hp-prodesk-400-g9',
                'sku': 'HP-PD400-G9',
                'category': 'pc-de-bureau', 'brand': 'hp',
                'price': 38000, 'stock': 30,
                'description': 'HP ProDesk 400 G9 Micro Tower. Intel Core i5-12500, 8 Go DDR4, SSD 256 Go. Compact et performant.',
                'short_description': 'Intel Core i5-12500, 8 Go, 256 Go SSD',
                'attributes': {'processeur': 'Intel Core i5-12500', 'ram': '8 Go DDR4', 'stockage': '256 Go SSD'},
            },
            {
                'name': 'Lenovo ThinkCentre M70s',
                'slug': 'lenovo-thinkcentre-m70s',
                'sku': 'LENOVO-M70S',
                'category': 'pc-de-bureau', 'brand': 'lenovo',
                'price': 42000, 'promotional_price': 37500,
                'stock': 20, 'is_new': True,
                'description': 'Lenovo ThinkCentre M70s Gen 4. Intel Core i7-12700, 16 Go DDR4, SSD 512 Go. Performance professionnelle.',
                'short_description': 'Intel Core i7-12700, 16 Go, 512 Go SSD',
                'attributes': {'processeur': 'Intel Core i7-12700', 'ram': '16 Go DDR4', 'stockage': '512 Go SSD'},
            },
            # PC Portables
            {
                'name': 'Dell Latitude 5530',
                'slug': 'dell-latitude-5530',
                'sku': 'DELL-LAT5530',
                'category': 'pc-portable', 'brand': 'dell',
                'price': 65000, 'promotional_price': 58900,
                'stock': 15, 'is_featured': True,
                'description': 'PC Portable Dell Latitude 5530. 15.6", Intel Core i7-1265U, 16 Go DDR5, SSD 512 Go. Robuste et léger pour les professionnels.',
                'short_description': '15.6" i7-1265U, 16 Go, 512 Go SSD',
                'attributes': {'ecran': '15.6" FHD IPS', 'processeur': 'Intel Core i7-1265U', 'ram': '16 Go DDR5', 'stockage': '512 Go SSD NVMe', 'autonomie': '10h'},
            },
            {
                'name': 'Lenovo ThinkPad T14s Gen 4',
                'slug': 'lenovo-thinkpad-t14s-gen4',
                'sku': 'LENOVO-TP-T14SG4',
                'category': 'pc-portable', 'brand': 'lenovo',
                'price': 85000, 'stock': 10, 'is_featured': True, 'is_new': True,
                'description': 'Lenovo ThinkPad T14s Gen 4. 14", AMD Ryzen 7 PRO 7840U, 32 Go LPDDR5x, SSD 1 To. Le portable professionnel par excellence.',
                'short_description': '14" Ryzen 7 PRO, 32 Go, 1 To SSD',
                'attributes': {'ecran': '14" WUXGA IPS', 'processeur': 'AMD Ryzen 7 PRO 7840U', 'ram': '32 Go LPDDR5x', 'stockage': '1 To SSD NVMe', 'autonomie': '15h'},
            },
            {
                'name': 'HP EliteBook 840 G10',
                'slug': 'hp-elitebook-840-g10',
                'sku': 'HP-EB840-G10',
                'category': 'pc-portable', 'brand': 'hp',
                'price': 78000, 'promotional_price': 72000,
                'stock': 12,
                'description': 'HP EliteBook 840 G10. 14", Intel Core i7-1365U, 16 Go DDR5, SSD 512 Go. Design élégant et sécurité avancée.',
                'short_description': '14" i7-1365U, 16 Go, 512 Go SSD',
                'attributes': {'ecran': '14" WUXGA IPS', 'processeur': 'Intel Core i7-1365U', 'ram': '16 Go DDR5', 'stockage': '512 Go SSD NVMe'},
            },
            {
                'name': 'Asus ZenBook 14 OLED',
                'slug': 'asus-zenbook-14-oled',
                'sku': 'ASUS-ZB14-OLED',
                'category': 'pc-portable', 'brand': 'asus',
                'price': 72000, 'stock': 8,
                'description': 'Asus ZenBook 14 OLED. 14" OLED 2.8K, Intel Core Ultra 7, 16 Go, SSD 512 Go. Écran OLED magnifique.',
                'short_description': '14" OLED 2.8K, Core Ultra 7, 16 Go',
                'attributes': {'ecran': '14" 2.8K OLED', 'processeur': 'Intel Core Ultra 7 155H', 'ram': '16 Go LPDDR5x', 'stockage': '512 Go SSD'},
            },
            # Serveurs
            {
                'name': 'Dell PowerEdge T350',
                'slug': 'dell-poweredge-t350',
                'sku': 'DELL-PE-T350',
                'category': 'serveurs', 'brand': 'dell',
                'price': 185000, 'stock': 5, 'is_featured': True,
                'description': 'Serveur tour Dell PowerEdge T350. Intel Xeon E-2334, 16 Go DDR4 ECC, 2x 480 Go SSD SAS. Pour les PME.',
                'short_description': 'Xeon E-2334, 16 Go ECC, 2x 480 Go SSD',
                'attributes': {'processeur': 'Intel Xeon E-2334', 'ram': '16 Go DDR4 ECC', 'stockage': '2x 480 Go SSD SAS', 'type': 'Tour'},
            },
            {
                'name': 'HP ProLiant ML30 Gen11',
                'slug': 'hp-proliant-ml30-gen11',
                'sku': 'HP-ML30-G11',
                'category': 'serveurs', 'brand': 'hp',
                'price': 145000, 'promotional_price': 129900,
                'stock': 7,
                'description': 'Serveur HP ProLiant ML30 Gen11. Intel Xeon E-2336, 16 Go DDR4 ECC, 2x 1 To SATA. Solution abordable et fiable.',
                'short_description': 'Xeon E-2336, 16 Go ECC, 2x 1 To',
                'attributes': {'processeur': 'Intel Xeon E-2336', 'ram': '16 Go DDR4 ECC', 'stockage': '2x 1 To SATA', 'type': 'Tour'},
            },
            # Composants - Processeurs
            {
                'name': 'Intel Core i9-14900K',
                'slug': 'intel-core-i9-14900k',
                'sku': 'INT-I9-14900K',
                'category': 'processeurs', 'brand': 'intel',
                'price': 52000, 'promotional_price': 48900,
                'stock': 10, 'is_new': True,
                'description': 'Processeur Intel Core i9-14900K. 24 cœurs (8P+16E), 32 threads, jusqu\'à 6.0 GHz. La puissance ultime.',
                'short_description': '24 cœurs, 32 threads, jusqu\'à 6.0 GHz',
                'attributes': {'cœurs': '24', 'threads': '32', 'frequence': '6.0 GHz turbo', 'tdp': '253W', 'socket': 'LGA 1700'},
            },
            {
                'name': 'AMD Ryzen 9 7950X',
                'slug': 'amd-ryzen-9-7950x',
                'sku': 'AMD-R9-7950X',
                'category': 'processeurs', 'brand': 'amd',
                'price': 58000, 'stock': 8,
                'description': 'Processeur AMD Ryzen 9 7950X. 16 cœurs, 32 threads, jusqu\'à 5.7 GHz. Architecture Zen 4.',
                'short_description': '16 cœurs, 32 threads, 5.7 GHz',
                'attributes': {'cœurs': '16', 'threads': '32', 'frequence': '5.7 GHz turbo', 'tdp': '170W', 'socket': 'AM5'},
            },
            {
                'name': 'Intel Core i5-13600K',
                'slug': 'intel-core-i5-13600k',
                'sku': 'INT-I5-13600K',
                'category': 'processeurs', 'brand': 'intel',
                'price': 32000, 'promotional_price': 28500,
                'stock': 15,
                'description': 'Intel Core i5-13600K. 14 cœurs (6P+8E), 20 threads. Excellent rapport performance/prix.',
                'short_description': '14 cœurs, 20 threads, 5.1 GHz',
                'attributes': {'cœurs': '14', 'threads': '20', 'frequence': '5.1 GHz turbo', 'tdp': '181W', 'socket': 'LGA 1700'},
            },
            # RAM
            {
                'name': 'Kingston Fury Beast 32 Go DDR5',
                'slug': 'kingston-fury-beast-32-ddr5',
                'sku': 'KNG-FB32-DDR5',
                'category': 'memoire-ram', 'brand': 'kingston',
                'price': 8500, 'stock': 50,
                'description': 'Kit mémoire Kingston Fury Beast 32 Go (2x16 Go) DDR5-5200. XMP 3.0, heatspreader noir.',
                'short_description': '2x16 Go DDR5-5200, XMP 3.0',
                'attributes': {'capacite': '32 Go (2x16 Go)', 'type': 'DDR5', 'frequence': '5200 MHz', 'latence': 'CL40'},
            },
            {
                'name': 'Crucial 64 Go DDR5 Kit',
                'slug': 'crucial-64-ddr5-kit',
                'sku': 'CRU-64-DDR5',
                'category': 'memoire-ram', 'brand': 'crucial',
                'price': 16500, 'promotional_price': 14900,
                'stock': 20, 'is_new': True,
                'description': 'Kit mémoire Crucial 64 Go (2x32 Go) DDR5-4800. Pour stations de travail et serveurs.',
                'short_description': '2x32 Go DDR5-4800',
                'attributes': {'capacite': '64 Go (2x32 Go)', 'type': 'DDR5', 'frequence': '4800 MHz', 'latence': 'CL40'},
            },
            # Stockage
            {
                'name': 'Samsung 990 Pro 2 To NVMe',
                'slug': 'samsung-990-pro-2to',
                'sku': 'SAM-990P-2TO',
                'category': 'stockage', 'brand': 'samsung-memory',
                'price': 18500, 'promotional_price': 16500,
                'stock': 25, 'is_best_seller': True,
                'description': 'SSD Samsung 990 Pro 2 To NVMe PCIe 4.0. Vitesse lecture 7450 Mo/s, écriture 6900 Mo/s.',
                'short_description': '2 To NVMe PCIe 4.0, 7450 Mo/s',
                'attributes': {'capacite': '2 To', 'interface': 'NVMe PCIe 4.0 x4', 'vitesse_lecture': '7450 Mo/s', 'vitesse_ecriture': '6900 Mo/s'},
            },
            {
                'name': 'WD Red Plus 4 To NAS',
                'slug': 'wd-red-plus-4to-nas',
                'sku': 'WD-RP-4TO',
                'category': 'stockage', 'brand': 'western-digital',
                'price': 12000, 'stock': 30,
                'description': 'Disque dur WD Red Plus 4 To pour NAS. 5400 RPM, CMR, 256 Mo cache. Conçu pour fonctionnement 24/7.',
                'short_description': '4 To NAS, 5400 RPM, CMR',
                'attributes': {'capacite': '4 To', 'vitesse': '5400 RPM', 'cache': '256 Mo', 'format': '3.5"', 'usage': 'NAS 24/7'},
            },
            {
                'name': 'Seagate IronWolf 8 To NAS',
                'slug': 'seagate-ironwolf-8to-nas',
                'sku': 'SEG-IW-8TO',
                'category': 'stockage', 'brand': 'seagate',
                'price': 22000, 'stock': 15,
                'description': 'Disque dur Seagate IronWolf 8 To pour NAS. 7200 RPM, CMR, 256 Mo cache. Performance NAS optimisée.',
                'short_description': '8 To NAS, 7200 RPM, CMR',
                'attributes': {'capacite': '8 To', 'vitesse': '7200 RPM', 'cache': '256 Mo', 'format': '3.5"', 'usage': 'NAS 24/7'},
            },
            # Cartes Graphiques
            {
                'name': 'NVIDIA RTX 4070 Super',
                'slug': 'nvidia-rtx-4070-super',
                'sku': 'NV-RTX4070S',
                'category': 'cartes-graphiques', 'brand': 'nvidia',
                'price': 52000, 'promotional_price': 48500,
                'stock': 8,
                'description': 'Carte graphique NVIDIA GeForce RTX 4070 Super. 12 Go GDDR6X, architecture Ada Lovelace.',
                'short_description': '12 Go GDDR6X, Ada Lovelace',
                'attributes': {'memoire': '12 Go GDDR6X', 'architecture': 'Ada Lovelace', 'tdp': '220W', 'sorties': '3x DP 1.4a, 1x HDMI 2.1'},
            },
            {
                'name': 'AMD Radeon RX 7800 XT',
                'slug': 'amd-radeon-rx-7800xt',
                'sku': 'AMD-RX7800XT',
                'category': 'cartes-graphiques', 'brand': 'amd',
                'price': 48000, 'stock': 10,
                'description': 'Carte graphique AMD Radeon RX 7800 XT. 16 Go GDDR6, architecture RDNA 3.',
                'short_description': '16 Go GDDR6, RDNA 3',
                'attributes': {'memoire': '16 Go GDDR6', 'architecture': 'RDNA 3', 'tdp': '263W'},
            },
            # Écrans
            {
                'name': 'Dell UltraSharp U2723QE 27"',
                'slug': 'dell-ultrasharp-u2723qe',
                'sku': 'DELL-U2723QE',
                'category': 'moniteurs', 'brand': 'dell',
                'price': 65000, 'promotional_price': 59900,
                'stock': 12, 'is_featured': True,
                'description': 'Moniteur Dell UltraSharp 27" 4K USB-C Hub IPS Black. Couleurs professionnelles, 100% sRGB, 98% DCI-P3.',
                'short_description': '27" 4K IPS USB-C Hub',
                'attributes': {'taille': '27"', 'resolution': '4K UHD (3840x2160)', 'panneau': 'IPS Black', 'connectique': 'USB-C 90W, HDMI, DP', 'couleurs': '100% sRGB, 98% DCI-P3'},
            },
            {
                'name': 'LG 27UL850-W 27"',
                'slug': 'lg-27ul850w',
                'sku': 'LG-27UL850W',
                'category': 'moniteurs', 'brand': 'lg',
                'price': 48000, 'stock': 18,
                'description': 'Moniteur LG 27" 4K UHD USB-C HDR500. VESA DisplayHDR 500, 99% sRGB.',
                'short_description': '27" 4K UHD USB-C HDR500',
                'attributes': {'taille': '27"', 'resolution': '4K UHD', 'panneau': 'IPS', 'hdr': 'HDR500', 'connectique': 'USB-C, HDMI, DP'},
            },
            {
                'name': 'Samsung Odyssey G7 32"',
                'slug': 'samsung-odyssey-g7-32',
                'sku': 'SAM-ODG7-32',
                'category': 'moniteurs', 'brand': 'samsung',
                'price': 55000, 'promotional_price': 49900,
                'stock': 10,
                'description': 'Moniteur Samsung Odyssey G7 32" QHD 240Hz. Courbe 1000R, 1ms, HDR600.',
                'short_description': '32" QHD 240Hz, courbe 1000R',
                'attributes': {'taille': '32"', 'resolution': 'QHD (2560x1440)', 'taux_restock': '240Hz', 'temps_restock': '1ms', 'courbure': '1000R'},
            },
            # Imprimantes
            {
                'name': 'HP LaserJet Pro M404dn',
                'slug': 'hp-laserjet-pro-m404dn',
                'sku': 'HP-LJP-M404DN',
                'category': 'imprimantes-laser', 'brand': 'hp',
                'price': 32000, 'stock': 20,
                'description': 'Imprimante laser HP LaserJet Pro M404dn. Mono, recto-verso, réseau. 38 ppm.',
                'short_description': 'Laser mono, recto-verso, 38 ppm',
                'attributes': {'type': 'Laser mono', 'vitesse': '38 ppm', 'resolution': '4800x600 dpi', 'recto_verso': 'Oui', 'connectique': 'USB, Ethernet'},
            },
            {
                'name': 'Canon imageRUNNER C3326i',
                'slug': 'canon-imagerunner-c3326i',
                'sku': 'CAN-IRC3326I',
                'category': 'multifonctions', 'brand': 'canon',
                'price': 185000, 'promotional_price': 169000,
                'stock': 5,
                'description': 'Multifonction couleur Canon imageRUNNER C3326i. Impression, copie, scan, 26 ppm couleur.',
                'short_description': 'Multifonction couleur, 26 ppm',
                'attributes': {'type': 'Multifonction couleur', 'vitesse': '26 ppm', 'resolution': '1200x1200 dpi', 'fonctions': 'Impression, Copie, Scan', 'papier': 'A6-A3'},
            },
            {
                'name': 'Epson EcoTank L3210',
                'slug': 'epson-ecotank-l3210',
                'sku': 'EPS-ET-L3210',
                'category': 'imprimantes-jet-encre', 'brand': 'epson',
                'price': 22000, 'is_best_seller': True,
                'stock': 25,
                'description': 'Imprimante Epson EcoTank L3210. Multifonction à réservoir d\'encre intégré. Économique.',
                'short_description': 'Multifonction EcoTank, réservoir intégré',
                'attributes': {'type': 'Jet d\'encre', 'resolution': '5760x1440 dpi', 'vitesse': '10 ppm noir, 5 ppm couleur', 'fonctions': 'Impression, Copie, Scan'},
            },
            # Réseau
            {
                'name': 'Ubiquiti UniFi Dream Router',
                'slug': 'ubiquiti-unifi-dream-router',
                'sku': 'UBI-UDR',
                'category': 'routeurs', 'brand': 'ubiquiti',
                'price': 18500, 'stock': 15,
                'description': 'Routeur Ubiquiti UniFi Dream Router WiFi 6. Gestion centralisée, pare-feu intégré.',
                'short_description': 'WiFi 6, UniFi OS, pare-feu intégré',
                'attributes': {'wifi': 'WiFi 6', 'ports': '4x GbE, 2x PoE', 'cpu': 'Quad-core', 'memoire': '2 Go DDR4'},
            },
            {
                'name': 'Cisco Catalyst 1000-24T',
                'slug': 'cisco-catalyst-1000-24t',
                'sku': 'CISCO-C1000-24T',
                'category': 'commutateurs', 'brand': 'cisco',
                'price': 42000, 'stock': 10,
                'description': 'Commutateur Cisco Catalyst 1000. 24 ports GbE, gestionné, Rack 19".',
                'short_description': '24 ports GbE, gestionné, Rack 19"',
                'attributes': {'ports': '24x GbE', 'uplinks': '2x 1G SFP', 'gestion': 'Fully managed', 'format': '1U Rack'},
            },
            {
                'name': 'TP-Link Omada EAP670',
                'slug': 'tp-link-omada-eap670',
                'sku': 'TPL-EAP670',
                'category': 'points-acces-wifi', 'brand': 'tp-link',
                'price': 12500, 'stock': 20,
                'description': 'Point d\'accès WiFi 6 TP-Link Omada EAP670. Bande double, 2.5 GbE, PoE+.',
                'short_description': 'WiFi 6 AX5400, 2.5 GbE, PoE+',
                'attributes': {'wifi': 'WiFi 6 AX5400', 'ports': '1x 2.5 GbE', 'poe': 'PoE+ 802.3at', 'couverture': 'Jusqu\'à 200 m²'},
            },
            # Onduleurs
            {
                'name': 'APC Smart-UPS 1500VA',
                'slug': 'apc-smart-ups-1500va',
                'sku': 'APC-SMT1500',
                'category': 'onduleurs', 'brand': 'apc',
                'price': 58000, 'promotional_price': 52000,
                'stock': 10, 'is_featured': True,
                'description': 'Onduleur APC Smart-UPS 1500VA/1000W LCD. AVR, USB, network management card.',
                'short_description': '1500VA/1000W, AVR, LCD',
                'attributes': {'puissance_va': '1500 VA', 'puissance_w': '1000 W', 'type': 'Line-interactive', 'autonomie': '20 min à charge complète', 'connectique': 'USB, RS-232'},
            },
            {
                'name': 'Eaton 5P1500',
                'slug': 'eaton-5p1500',
                'sku': 'EAT-5P1500',
                'category': 'onduleurs', 'brand': 'eaton',
                'price': 52000, 'stock': 8,
                'description': 'Onduleur Eaton 5P1500. 1500VA/1350W, AVR, communication réseau.',
                'short_description': '1500VA/1350W, AVR',
                'attributes': {'puissance_va': '1500 VA', 'puissance_w': '1350 W', 'type': 'Line-interactive', 'autonomie': '18 min à charge complète'},
            },
            # Mobilier
            {
                'name': 'Chaise Ergonomique Pro',
                'slug': 'chaise-ergonomique-pro',
                'sku': 'MOB-CH-ERG-PRO',
                'category': 'chaises-bureau', 'brand': 'herman-miller',
                'price': 85000, 'promotional_price': 75000,
                'stock': 15, 'is_featured': True,
                'description': 'Chaise ergonomique professionnelle. Accoudoirs réglables 4D, support lombaire, assise mesh.',
                'short_description': 'Ergonomique, mesh, accoudoirs 4D',
                'attributes': {'material': 'Mesh respirant', 'reglages': 'Accoudoirs 4D, hauteur, inclinaison', 'support_lombaire': 'Réglable', 'poids_max': '150 kg'},
            },
            {
                'name': 'Bureau Adjustable Électrique',
                'slug': 'bureau-adjustable-electrique',
                'sku': 'MOB-BUR-ADJ-EL',
                'category': 'bureaux', 'brand': 'humanscale',
                'price': 65000, 'stock': 12, 'is_new': True,
                'description': 'Bureau assis-debout à réglage électrique. Hauteur 65-130 cm, mémoire positions, surface 160x80 cm.',
                'short_description': 'Assis-debout, électrique, mémoire',
                'attributes': {'hauteur': '65-130 cm', 'surface': '160x80 cm', 'moteur': 'Double moteur', 'memoire': '3 positions', 'charge': '80 kg'},
            },
            {
                'name': 'Meuble Serveur 12U',
                'slug': 'meuble-serveur-12u',
                'sku': 'MOB-MBV-12U',
                'category': 'meubles-serveur', 'brand': 'vertiv',
                'price': 45000, 'stock': 8,
                'description': 'Meuble serveur fermé 12U. Vitre tintée, ventilation active, serrure, roulettes.',
                'short_description': '12U fermé, vitre, ventilation',
                'attributes': {'hauteur': '12U (60 cm)', 'profondeur': '80 cm', 'largeur': '60 cm', 'ventilation': '2x ventilateurs', 'poids_max': '200 kg'},
            },
        ]

        created_count = 0
        for pdata in products_data:
            cat_slug = pdata.pop('category')
            brand_slug = pdata.pop('brand')
            pdata['category'] = cats[cat_slug]
            pdata['brand'] = brands[brand_slug]
            pdata['user'] = user
            pdata['is_active'] = True
            pdata['vat'] = 19.0  # TVA Algérie

            product, created = Product.objects.get_or_create(
                sku=pdata['sku'],
                defaults=pdata
            )
            if created:
                created_count += 1
            # Re-populate for Image/Variant creation
            pdata['category'] = cats[cat_slug]
            pdata['brand'] = brands[brand_slug]
            pdata['user'] = user

        self.stdout.write(self.style.SUCCESS(f'  Created {created_count} products'))

        # ── SUMMARY ─────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS(f'\nDone!'))
        self.stdout.write(f'  Categories: {Category.objects.count()}')
        self.stdout.write(f'  Brands: {Brand.objects.count()}')
        self.stdout.write(f'  Products: {Product.objects.count()}')
