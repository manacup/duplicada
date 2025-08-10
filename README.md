# Duplicada

Aplicació web per gestionar partides de Scrabble modalitat Duplicada, amb suport per a diversos jugadors, mestre, rondes, tauler interactiu i sincronització en temps real mitjançant Firebase Cloud Firestore.

## Característiques
- Gestió de rondes i jugades en temps real
- Tauler i faristol interactius
- Rànquing automàtic i resultats
- Instruccions detallades per a jugadors i mestre
- Disseny responsiu i estil amb Bootstrap

## Estructura del projecte

```
duplicada/
├── calcul.js              # Lògica de càlcul de jugades i puntuacions
├── classificacio.js       # Rànquing i classificació
├── firebase.js            # Connexió i referències a Firestore
├── formulariRespostes.js  # Gestió del formulari de respostes
├── gestioRondes.js        # Gestió de rondes, UI i sincronització
├── index.html             # Pàgina principal
├── instruccions.html      # Instruccions per a jugadors i mestre
├── login.js               # Gestió d'inici de sessió
├── partida.html           # Vista principal de la partida
├── rackTile.js            # Gestió del faristol i fitxes
├── rellotge.js            # Temporitzador
├── resultats.js           # Visualització de resultats
├── style.css              # Estils personalitzats
├── tauler.js              # Lògica i renderitzat del tauler
├── utilitats.js           # Funcions utilitàries
├── dicc/                  # Diccionari i recursos
│   └── disc.js
├── imatges/               # Imatges i logotips
├── wdtjs/                 # Llibreries addicionals
```

## Requisits previs
- Node.js i npm (per a desenvolupament avançat)
- Compte de Firebase i configuració de Firestore
- Navegador modern

## Instal·lació i execució
1. Clona el repositori:
   ```
   git clone https://github.com/manacup/duplicada.git
   ```
2. Configura `firebase.js` amb les teves credencials de Firebase.
3. Obre `index.html` o `partida.html` en el navegador.

## Desenvolupament
- El codi està modularitzat en fitxers JavaScript per facilitar la mantenibilitat.
- Utilitza Bootstrap per a l'estil i la responsivitat.
- Les dades es sincronitzen en temps real amb Firestore.

### Bones pràctiques
- Fes servir funcions asíncrones per a operacions amb Firestore.
- Mantén la lògica de la UI separada de la lògica de negoci.
- Comenta el codi i escriu noms descriptius per a funcions i variables.

## Contribució
1. Fes un fork del repositori
2. Crea una branca per la teva funcionalitat o correcció
3. Fes un pull request explicant els canvis
4. Respecta l'estil de codi i la modularitat

## Contacte
Per a dubtes o suggeriments, obre una issue o contacta amb l'autor a través de GitHub.
