# LoLStats — Projet Alexandre & Nazim

Application Angular + backend qui consomme l’API Riot Games.

## Prérequis

- Node.js + npm
- Clé d’API **Riot Games (Dev)** valide
- `npm install` dans **/backend** et à la racine du projet

## Installation

Dans deux terminaux séparés :

1) Backend
```bash
cd backend
npm install
npm run dev
```

2) Frontend
```bash
npm install
ng serve
```

Ouvrir ensuite :
```
http://localhost:4200
```

## Configuration (.env)

Vérifie le fichier `backend/.env`.  
Il doit contenir au minimum :

```
PORT=3000
RIOT_API_KEY=VOTRE_CLE
RIOT_REGIONAL_BASE=https://europe.api.riotgames.com
RIOT_PLATFORM_BASE=https://euw1.api.riotgames.com
```

## Obtenir une clé Riot Games (Dev)

1) Crée un compte développeur Riot Games.
2) Génère une **clé d’API Dev**.

Lien officiel :
```
https://developer.riotgames.com/
```

## Notes

- La clé **Dev** expire tous les 24 heures : pensez à la renouveler.
- En cas d’erreur “Rate limit”, attendez quelques secondes ou relancez.
