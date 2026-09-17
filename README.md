# 🎨 Rainbow Colors - E-Commerce Store (Tunisia)

Boutique en ligne complète pour la vente de peintures et matériaux de construction en Tunisie.

---

## ✅ Ce qui est inclus

| Module | Statut |
|--------|--------|
| Backend API (Node.js/Express/Prisma) | ✅ |
| Base de données SQLite avec 17 produits | ✅ |
| Authentification JWT (Client + Admin) | ✅ |
| Frontend Store (11 pages) | ✅ |
| Admin Dashboard complet | ✅ |
| Panier + Favoris + Commandes | ✅ |
| Paiement tunisien (COD, Carte, E-Dinar) | ✅ |
| Upload d'images produits | ✅ |
| Responsive design | ✅ |

---

## 🚀 Démarrage rapide

### Étape 1 : Prérequis

Installez **Node.js 18+** : https://nodejs.org

Vérifiez :
```bash
node -v   # doit afficher v18.x ou plus
npm -v    # doit afficher 9.x ou plus
```

### Étape 2 : Installer le backend

```bash
cd rainbow-colors-store/backend
npm install
```

### Étape 3 : Créer la base de données

```bash
npx prisma generate
npx prisma migrate dev --name init
```

> Répondez `yes` si on vous demande de réinitialiser la base.

### Étape 4 : Remplir la base de données

```bash
npx ts-node src/utils/seed.ts
```

Vous verrez :
```
✅ Seed completed!
👤 Admin: admin@rainbow-colors.tn / admin123
👤 Customer: client@demo.tn / client123
```

### Étape 5 : Démarrer le serveur

```bash
npm run dev
```

Le serveur démarre sur **http://localhost:3000**

Vous verrez :
```
🎨 Rainbow Colors Server running on http://localhost:3000
🛒 Store: http://localhost:3000
⚙️  Admin: http://localhost:3000/admin
```

---

## 🔑 Accès

| Rôle | URL | Email | Mot de passe |
|------|-----|-------|-------------|
| **Boutique** | http://localhost:3000 | (créez un compte) | - |
| **Admin** | http://localhost:3000/admin | admin@rainbow-colors.tn | admin123 |
| **Client démo** | http://localhost:3000 | client@demo.tn | client123 |

---

## 📁 Structure du projet

```
rainbow-colors-store/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma client, Upload config
│   │   ├── controllers/     # Auth, Products, Cart, Orders, Payment, Admin
│   │   ├── middleware/      # JWT auth, Error handler
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Database seed
│   │   └── index.ts         # Server entry
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── uploads/products/    # Uploaded product images
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                 # Environment variables
│
├── frontend/
│   ├── store/               # Customer-facing website
│   │   ├── index.html       # Homepage
│   │   ├── products.html    # Product catalog
│   │   ├── product.html     # Product detail
│   │   ├── categories.html  # Categories
│   │   ├── cart.html        # Shopping cart
│   │   ├── checkout.html    # Checkout + payment
│   │   ├── orders.html      # Order history
│   │   ├── account.html     # User profile
│   │   ├── wishlist.html    # Favorites
│   │   ├── search.html      # Search
│   │   ├── about.html       # About us
│   │   ├── contact.html     # Contact form
│   │   ├── css/style.css    # Styles
│   │   ├── js/main.js       # API client + interactions
│   │   └── images/          # Product photos (24 images)
│   │
│   └── admin/               # Admin dashboard
│       ├── index.html       # Dashboard
│       ├── css/admin.css    # Admin styles
│       └── js/admin.js      # Admin logic
│
└── README.md
```

---

## 🗄️ Base de données (Prisma Schema)

```
User        → id, email, password, firstName, lastName, phone, address, city, role
Category    → id, name, slug, description, icon, color
Product     → id, name, slug, description, price, oldPrice, stock, stockStatus, badge, image, categoryId
Cart        → id, userId
CartItem    → id, cartId, productId, quantity, price
Wishlist    → id, userId, productId
Order       → id, orderNumber, userId, status, paymentStatus, paymentMethod, subtotal, shipping, tax, total, ...address
OrderItem   → id, orderId, productId, name, price, quantity
Review      → id, userId, productId, rating, comment
```

---

## 💳 Paiement (Méthodes tunisiennes)

| Méthode | Description | Statut |
|---------|-------------|--------|
| 💵 **COD** | Paiement à la livraison | ✅ Fonctionnel |
| 💳 **Carte Bancaire** | Visa/Mastercard tunisienne | ✅ Simulé |
| 📮 **E-Dinar** | La Poste Tunisienne | ✅ Simulé |

> **Note production** : Pour intégrer un vrai paiement par carte en Tunisie, contactez la **Société Monétique Tunisienne (SMT)** ou votre banque pour obtenir une API de paiement en ligne.

---

## 🛠️ Commandes utiles

```bash
# Démarrer le serveur en développement
cd backend && npm run dev

# Compiler pour production
cd backend && npm run build

# Démarrer en production
cd backend && npm start

# Ouvrir Prisma Studio (visualiser la DB)
cd backend && npx prisma studio

# Nouvelle migration après modification du schema
cd backend && npx prisma migrate dev

# Régénérer le client Prisma
cd backend && npx prisma generate
```

---

## 🌐 API Endpoints

### Auth
- `POST /api/auth/register` → Créer un compte
- `POST /api/auth/login` → Connexion
- `GET /api/auth/me` → Profil connecté
- `PATCH /api/auth/profile` → Modifier profil

### Products (public)
- `GET /api/products` → Liste des produits
- `GET /api/products/:slug` → Détail d'un produit
- `GET /api/products/categories` → Liste des catégories

### Products (admin)
- `POST /api/admin/products` → Créer un produit (+ image)
- `PATCH /api/admin/products/:id` → Modifier un produit
- `DELETE /api/admin/products/:id` → Supprimer un produit

### Cart
- `GET /api/cart` → Voir le panier
- `POST /api/cart` → Ajouter au panier
- `PATCH /api/cart/:id` → Modifier quantité
- `DELETE /api/cart/:id` → Retirer du panier

### Wishlist
- `GET /api/wishlist` → Voir les favoris
- `POST /api/wishlist/:id` → Ajouter/Retirer favori

### Orders
- `POST /api/orders` → Créer une commande
- `GET /api/orders` → Historique des commandes

### Payment
- `GET /api/payment/methods` → Méthodes de paiement
- `POST /api/payment/process` → Traiter un paiement

### Admin
- `GET /api/admin/dashboard` → Statistiques
- `GET /api/admin/orders` → Toutes les commandes
- `PATCH /api/admin/orders/:id` → Modifier statut commande
- `GET /api/admin/users` → Tous les clients
- `GET /api/admin/products/all` → Tous les produits (admin)

---

## 🔒 Sécurité

- **Helmet** : Headers de sécurité HTTP
- **CORS** : Contrôle des origines
- **Rate Limiting** : 1000 requêtes / 15 minutes
- **JWT** : Tokens signés avec expiration
- **Bcrypt** : Mots de passe hashés (coût 12)
- **Zod** : Validation des données entrantes

---

## 🚀 Déploiement Production

### 1. Variables d'environnement

Modifiez `backend/.env` :
```env
DATABASE_URL="file:./prod.db"
JWT_SECRET="votre-cle-super-secrete-et-longue-ici"
FRONTEND_URL="https://votredomaine.tn"
PORT=3000
```

### 2. Base de données
```bash
cd backend
npx prisma migrate deploy
npm run build
npm start
```

### 3. Avec Nginx (recommandé)

```nginx
server {
    listen 80;
    server_name votredomaine.tn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Avec PM2 (process manager)

```bash
npm install -g pm2
cd backend
pm2 start dist/index.js --name "rainbow-colors"
pm2 save
pm2 startup
```

---

## 📞 Support

Rainbow Colors  
Route de Gabès Km 4,5 - Sfax, Tunisie  
📞 +216 29 253 908  
📧 contact@rainbow-colors.tn

---

**Made with ❤️ in Tunisia 🇹🇳**
