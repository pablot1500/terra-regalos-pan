# Terrari Pancha

Un jueguito pixel art para el navegador: dos personajes cavan un pozo en el patio de su edificio, juntan monedas y billetes, mejoran su equipo en el taller y buscan tres regalos: a **300 m**, a **800 m** y el último en el **núcleo de la Tierra**, pasando los **1500 m**.

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
| Correr (también volando) | Shift | Joystick a fondo |
| Saltar · volar con el jetpack | Espacio o W (mantener) | SALTAR (mantener) |
| Bajar despacio con el jetpack (no gasta energía) | S o ↓ (mantener) | SALTAR + joystick abajo |
| Cavar hacia abajo | Click abajo o J + S | Joystick abajo |
| Cavar en cualquier dirección | Click (apuntando con el mouse) | CAVAR + joystick (360°) |
| Cavar con teclado | J + W/A/S/D (8 direcciones) | — |
| Poner antorcha | T | Botón de antorcha |
| Abrir el taller | E | Botón TALLER |
| Prender/apagar el modo vuelo (últimos niveles del jetpack) | E | Botón VOLAR |
| Cavado automático (un click empieza, otro frena) | B o botón AUTO | Botón AUTO + toque en CAVAR |
| Música / sonidos | M / N o los botones de arriba | Botones de arriba |
| Pausa | Esc | Botón ❚❚ |

## Cómo se juega

- Arrancan en el departamento **1B**. Bajan por la escalera al patio y cavan en el **cantero del medio** (las baldosas no se rompen).
- La tierra esconde monedas, billetes, lingotes y gemas. Todo va a una billetera compartida.
- En el **Taller** (a la derecha del patio, con el perro salchicha) se compran mejoras, compartidas para los dos:
  - **Pala → Taladro**: más fuerza (desde el nivel 3 pasa a ser un taladro; el último es el Taladro cósmico). Cada capa (tierra, arcilla, piedra, granito, basalto, abismo, obsidiana) necesita una pala más fuerte.
  - **Pala ancha**: cava más bloques por palazo.
  - **Batería**: más energía (el último nivel es infinita).
  - **Armadura**: menos daño por caídas (el anteúltimo nivel te hace inmune; el último además baja 80% el daño de la lava).
  - **Jetpack**: volar más rápido, gastar menos energía y bajar más despacio con S. El anteúltimo nivel trae **modo vuelo** (E): sin gravedad, se maneja fácil para arriba, abajo y a los costados; el último lo hace rapidísimo.
  - **Casco de minero**: la lámpara ilumina más lejos bajo tierra.
  - Cada mejora de la pala/taladro y de la pala ancha también suma un poco de alcance para cavar.
- En el patio te espera **Popi**, el perro salchicha (acercate y apretá E para llevarlo, o desde el taller): con casquito y mini jetpack te sigue solo (camina, salta y vuela), te ayuda a cavar los bloques de al lado al 25% de tu ritmo, y no gasta energía ni se lastima.
- En el taller también se compran **antorchas** ($25): iluminan una zona grande y no se rompen al cavar.
- Cavar y volar gastan energía. En el departamento se recargan la energía y la vida.
- Si te quedás sin energía bajo tierra o te caés muy fuerte, te desmayás: volvés a casa y perdés el 10% de la plata.
- De los **1000 m** para abajo aparece la **obsidiana** (negrísima, se mezcla con el abismo), con cuevas grandes para volar, cada vez menos tesoros y **parches de lava**: brilla, quema, y si cavás por debajo se derrama como un líquido.
- A los **1500 m** la roca termina en una línea ondulada: abajo está el **núcleo**, una caverna de magma. Al romper el piso caés a una plataforma sobre un mar de lava; el último cofre está en su punta de abajo a la derecha (por ahora no se abre).
- El medidor de la derecha marca la profundidad y dónde están los regalos.
- La música cambia con la profundidad: dos canciones para la superficie (hasta 300 m), dos para la zona media (300 a 800 m) y dos para lo profundo (800 a 1500 m), con fundidos entre una y otra. Están escritas en texto en [`src/music.js`](src/music.js).
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
  world.js        generación del mundo, cavado libre (terreno de 2 px), render por chunks
  tiles.js        tipos de bloque y texturas pixel art
  structures.js   edificio, departamento, escalera, taller, patio
  sprites.js      personajes, tesoros, cofre, perro, íconos, fuente pixel
  player.js       física, cavado, jetpack, energía, caídas, animación
  background.js   cielo, nubes, barrio, costa y mar
  lighting.js     oscuridad del subsuelo y luces
  popi.js         Popi, el perro compañero (seguir, volar, ayudar a cavar)
  entities.js     partículas, tesoros que saltan, textos flotantes
  input.js        teclado, mouse y táctil
  audio.js        efectos de sonido (WebAudio, sin archivos)
  music.js        canciones por zona y director de música (fundidos)
  save.js         guardado (localStorage; preparado para Netlify Blobs)
```

Todo el arte se dibuja por código: no hay imágenes ni sonidos externos.

## Próximos pasos

- [ ] Cinemática inicial con el papel que marca dónde están los regalos
- [ ] Contenido real de los tres regalos
- [ ] Segundo jugador online (dos dispositivos al mismo tiempo)
- [ ] Deploy en Netlify + guardado en Netlify Blobs
