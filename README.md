# Terra Regalos

Un jueguito pixel art para el navegador: dos personajes cavan un pozo en el patio de su edificio, juntan monedas y billetes, mejoran su equipo en el taller y buscan tres regalos escondidos a **300 m**, **600 m** y **1000 m** de profundidad.

Funciona en escritorio y en celular (controles táctiles). Por ahora se juega de a uno; el modo online para dos llega después.

## Cómo correrlo

Necesitás [Node.js](https://nodejs.org) (cualquier versión reciente). No hay dependencias que instalar.

```bash
npm start
```

Después abrí <http://localhost:5173>.

Para probarlo en el celular, conectá el celu a la misma red Wi-Fi y abrí `http://IP-DE-TU-COMPU:5173`.

> Tiene que abrirse a través del servidor: si abrís `index.html` con doble click, el navegador bloquea los módulos.

## Controles

| Acción | Teclado / mouse | Celular |
|---|---|---|
| Caminar | A / D o ← → | Joystick |
| Saltar · volar con el jetpack | Espacio o W (mantener) | SALTAR (mantener) |
| Bajar volando despacio | Espacio + S | SALTAR + joystick abajo |
| Cavar hacia abajo | S o ↓ | Joystick abajo |
| Cavar hacia adelante / arriba | J (+ W para arriba) | CAVAR (+ joystick) |
| Cavar hacia el mouse | Click | — |
| Abrir el taller | E | Botón TALLER |
| Pausa | Esc | Botón ❚❚ |

## Cómo se juega

- Arrancan en el departamento **1B**. Bajan por la escalera al patio y cavan.
- La tierra esconde monedas, billetes, lingotes y gemas. Todo va a una billetera compartida.
- En el **Taller** (a la derecha del patio, con el gato) se compran mejoras, compartidas para los dos:
  - **Pala**: más fuerza. Cada capa (tierra, arcilla, piedra, granito, basalto, abismo) necesita una pala más fuerte.
  - **Pala ancha**: cava más bloques por palazo.
  - **Batería**: más energía.
  - **Armadura**: menos daño por caídas.
  - **Jetpack: Motor** y **Jetpack: Eficiencia**: volar más rápido y gastando menos.
- Cavar y volar gastan energía. En el departamento se recargan la energía y la vida.
- Si te quedás sin energía bajo tierra o te caés muy fuerte, te desmayás: volvés a casa y perdés el 10% de la plata.
- El medidor de la derecha marca la profundidad y dónde están los regalos.
- El progreso se guarda solo en el navegador (localStorage).

## Dónde cambiar cosas

Todo lo ajustable está en [`src/config.js`](src/config.js):

- `GIFTS`: profundidad, título y texto de cada regalo. **Acá van los regalos de verdad.**
- `CHARACTERS`: nombres de los personajes.
- `UPGRADES`: precios y valores de las mejoras.
- `ITEMS` / `LAYER_LOOT`: cuánto vale cada tesoro y qué tan seguido aparece.
- `DIG`, `PHYS`: velocidad de cavado, salto, daño por caída, etc.
- `ENDING_TEXT`: mensaje final.

## Estructura

```
index.html        HUD, menús y controles táctiles
styles.css        estilos de la interfaz
server.js         servidor local sin dependencias
src/
  main.js         loop del juego, estados, eventos (taller, cofres, desmayos)
  config.js       todos los números y textos ajustables
  world.js        generación del mundo, cavado, render por chunks
  tiles.js        tipos de bloque y texturas pixel art
  structures.js   edificio, departamento, escalera, taller, patio
  sprites.js      personajes, tesoros, cofre, gato, íconos, fuente pixel
  player.js       física, cavado, jetpack, energía, caídas, animación
  background.js   cielo, nubes, sol, ciudad y colinas
  lighting.js     oscuridad del subsuelo y luces
  entities.js     partículas, tesoros que saltan, textos flotantes
  input.js        teclado, mouse y táctil
  audio.js        efectos y música chiptune (WebAudio, sin archivos)
  save.js         guardado (localStorage; preparado para Netlify Blobs)
```

Todo el arte se dibuja por código: no hay imágenes ni sonidos externos.

## Próximos pasos

- [ ] Cinemática inicial con el papel que marca dónde están los regalos
- [ ] Contenido real de los tres regalos
- [ ] Segundo jugador online (dos dispositivos al mismo tiempo)
- [ ] Deploy en Netlify + guardado en Netlify Blobs
