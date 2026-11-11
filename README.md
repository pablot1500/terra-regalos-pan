# Cumple Panchita: Salven los regalos 2

(El repo se sigue llamando Terrari Pancha.)

Un jueguito pixel art para el navegador: dos personajes cavan un pozo en el patio de su edificio, juntan monedas y billetes, mejoran su equipo en el taller y buscan tres regalos: a **300 m**, a **800 m** y el último en el **núcleo de la Tierra**, pasando los **1500 m**.

Funciona en escritorio y en celular (controles táctiles). Por ahora se juega de a uno; el modo online para dos llega después.

## Cómo correrlo

Necesitás [Node.js](https://nodejs.org) (cualquier versión reciente). No hay dependencias que instalar.

```bash
npm start
```

Después abrí <http://localhost:5173>.

Para probarlo en el celular, conectá el celu a la misma red Wi-Fi y abrí `http://IP-DE-TU-COMPU:5173`.

> El sandbox de personajes está en `http://localhost:5173/?sandbox` (también hay un link en la pantalla de inicio): muestra cada personaje en grande, animado y cuadro por cuadro, con jetpack, casco, herramienta y fondo a elección.

> Tiene que abrirse a través del servidor: si abrís `index.html` con doble click, el navegador bloquea los módulos.

## Controles

| Acción | Teclado / mouse | Celular |
|---|---|---|
| Caminar | A / D o ← → | Joystick (aparece donde apoyás el pulgar en la mitad izquierda) |
| Correr (también volando) | Shift | Joystick a fondo |
| Saltar · volar con el jetpack | Espacio o W (mantener) | SALTAR (mantener) |
| Bajar despacio con el jetpack (no gasta energía) | S o ↓ (mantener) | SALTAR + joystick abajo |
| Cavar hacia abajo | Click abajo o J + S | Joystick abajo |
| Cavar en cualquier dirección | Click (apuntando con el mouse) | Tocar y mantener sobre el juego (cava hacia el dedo) o CAVAR + joystick (360°) |
| Cavar con teclado | J + W/A/S/D (8 direcciones) | — |
| Poner antorcha | T | Botón de antorcha |
| Comprar en el taller (parado frente a la ventanita) | E | Botón TALLER |
| Prender/apagar el modo vuelo (últimos niveles del jetpack) | E | Botón VOLAR |
| Cavado automático (un click empieza, otro frena) | B o botón AUTO | Botón AUTO + toque en CAVAR |
| Música / sonidos | M / N o los botones de arriba | Botones de arriba |
| Pausa | Esc | Botón ❚❚ |

En iPhone/iPad conviene agregarlo a la pantalla de inicio (Compartir → Agregar a pantalla de inicio) para jugar en pantalla completa. En iPad los botones son más grandes.

## Jugar online de a dos

- En el título o en la pausa: **Jugar online de a dos**. Uno toca **Crear sala** y le pasa el código de 4 letras al otro, que lo escribe y toca **Unirme**. Funciona entre compu, celu y tablet en cualquier combinación, mientras los dos tengan internet.
- La partida que se juega y se guarda es la de quien crea la sala (el anfitrión). El que se une maneja al otro personaje (si el anfitrión es Panchi, el invitado es Pablo, y al revés); su propia partida guardada no se toca.
- Cada uno maneja su personaje en su pantalla y ve al otro moverse. El mundo es compartido: lo que cava uno lo ve el otro, la plata y las mejoras son del equipo (el invitado también puede comprar en el Taller), los minerales los agarra cualquiera y las antorchas y los cofres son de los dos. Las charlas cada 120 m también aparecen.
- Las escenas con Aguilus se ven en las dos pantallas (cualquiera puede pasar los diálogos o saltarlas) y en la pelea Aguilus ataca a cualquiera de los dos; los dos pueden atajar rocas y tirárselas. Si cae uno, vuelven los dos a casa.
- La pausa no frena el mundo compartido: si el anfitrión pausa o entra al Taller, el otro sigue cavando y juntando plata (mientras tenés la pausa abierta, Aguilus no te pega).
- Popi lo puede llevar cualquiera de los dos (de a uno): el otro ve "Popi está con...".
- Si el invitado se desconecta, la sala sigue abierta y puede volver a entrar con el mismo código. Si se va el anfitrión, el invitado vuelve al inicio.
- Usa WebRTC con [PeerJS](https://peerjs.com/) (se conecta directo entre los dos dispositivos, sin servidor propio; el servidor gratuito de PeerJS solo los presenta). En algunas redes muy cerradas (algunas redes de empresa o datos móviles) la conexión directa puede no funcionar.

## Intro y pantalla de inicio

- Al abrir el juego hay que tocar la pantalla una vez (el navegador no deja sonar audio sin un toque) y arranca la **intro**:
  - El botón se desvanece y la cámara baja del cielo hasta el patio, con parallax (el cielo, las nubes, la costa, el barrio y la pared del fondo se mueven a distinto ritmo que el piso). Recién cuando llega, se abre el portón de la calle y entran los personajes por ahí.
  - Pablo y Panchi llegan al patio charlando sobre el cumple y lo que pasó el año pasado con los regalos, y Popi (que se coló en el auto) los saluda.
  - Suben la escalera hasta el departamento 1B y Pablo busca los regalos debajo de la cama. En su lugar encuentra una nota firmada "A" (y una pluma sospechosa): los regalos están "bien, bien, bieeen abajo".
  - "Mientras tanto, muy, muy abajo...": la cámara baja hasta el primer cofre, que brilla un rato, y vuelve al departamento.
  - Se miran con un "?" y se dan cuenta: ¡abajo de ellos! Después la cámara va hasta el taller de Carlos, donde ahora venden palas, y al final sube al cielo.
- La intro tiene barras de cine, zoom de cámara, diálogos con retrato que se escriben letra por letra (click, Espacio o Enter para avanzar) y un botón para saltarla.
- El guión está en [`src/intro.js`](src/intro.js), en la función `script()`. El texto de la nota es `NOTE_TEXT`.
- La pantalla de inicio, **Cumple Panchita: Salven los regalos 2**, tiene de fondo el cielo del juego. Ahí se elige personaje y hay botones para Empezar (o Continuar), Configuración (sonido y volúmenes), Controles y para ver la intro otra vez.
- Al empezar, la cámara baja del cielo hasta el departamento y arranca la partida.

## Cómo se juega

- Arrancan en el departamento **1B**, en el primer piso. Bajan por la escalera al patio y cavan en el **cantero del medio** (las baldosas no se rompen).
- La tierra esconde monedas, billetes, lingotes y gemas. Todo va a una billetera compartida.
- En el **Taller**, una casa rodante vintage estacionada a la derecha del patio, se compra por la ventanita-mostrador (hay que pararse frente a ella). Se venden mejoras, compartidas para los dos:
  - **Pala → Taladro**: más fuerza (desde el nivel 3 pasa a ser un taladro; el último es el Taladro cósmico). Cada capa (tierra, arcilla, piedra, granito, basalto, abismo, obsidiana) necesita una pala más fuerte.
  - **Pala ancha**: cava más bloques por palazo.
  - **Batería**: más energía (el último nivel es infinita).
  - **Armadura**: menos daño por caídas (el anteúltimo nivel te hace inmune; el último además baja 80% el daño de la lava).
  - **Jetpack**: volar más rápido, gastar menos energía y bajar más despacio con S. El anteúltimo nivel trae **modo vuelo** (E): sin gravedad, se maneja fácil para arriba, abajo y a los costados; el último lo hace rapidísimo.
  - **Casco de minero**: la lámpara ilumina más lejos bajo tierra.
  - Cada mejora de la pala/taladro y de la pala ancha también suma un poco de alcance para cavar.
- En el patio te espera **Popi**, el perro salchicha (acercate y apretá E para llevarlo, o desde el taller): con casquito y mini jetpack te sigue solo (camina, salta y vuela), te ayuda a cavar los bloques de al lado al 25% de tu ritmo, y no gasta energía ni se lastima.
- **Compañero:** si jugás con Pablo, Panchi te acompaña manejada por la compu (y al revés). Te sigue más o menos libre, vuela con vos, junta lo que encuentre y cava al costado de donde estás cavando; no se lastima ni gasta energía. Cada 120 m charlan con burbujitas de diálogo (sin frenar el juego). Se prende o apaga en Configuración. Está armado para que más adelante el compañero lo pueda manejar otra persona.
- En el taller también se compran **antorchas** ($25): iluminan una zona grande y no se rompen al cavar.
- Cavar y volar gastan energía. En el departamento se recargan la energía y la vida.
- Si te quedás sin energía bajo tierra o te caés muy fuerte, te desmayás: volvés a casa y perdés el 10% de la plata.
- De los **1000 m** para abajo aparece la **obsidiana** (negrísima, se mezcla con el abismo), con cuevas grandes para volar, cada vez menos tesoros y **parches de lava**: brilla, quema, y si cavás por debajo se derrama como un líquido.
- A los **1500 m** la roca termina en una línea ondulada: abajo está el **núcleo**, una caverna enorme de magma. Al romper el piso caés unos 190 m (el fondo se mueve con parallax: magma lejos y, hacia abajo, un mundo abierto de cuevas de lava con mesetas, cascadas y un lago) hasta una plataforma sobre un mar de lava. La lava que se derrama desde arriba se va evaporando mientras cae. El último cofre está en la punta de abajo a la derecha de la plataforma (por ahora no se abre).
- La lava se guarda tal como quedó: si se derramó, no vuelve a aparecer al recargar. La que queda cayendo fuera de pantalla sigue moviéndose de a poco.

## Aguilus (el jefe)

- Al pisar la plataforma del núcleo arranca una charla con **Aguilus**, el águila mago que escondió los regalos. Es más alto y estilizado que Pablo y Panchi, con túnica larga y báculo. La pareja cae detrás y da los consejos para la pelea.
- **Pelea:** Aguilus vuela de un lado al otro cambiando de ritmo (lento, ráfagas rápidas, pausas) y alterna hechizos:
  - **Rocas de magma** (piedras marrones irregulares con grietas encendidas; en el piso aparece un aviso de dónde caen). Manteniendo el taladro apuntado a una roca, se queda pegada en la punta; con **E** (o el botón LANZAR) se la devolvés. Va adonde apuntás (mouse o taladro), sin corrección: si Aguilus se mueve hay que adelantarse. Una línea de puntitos muestra el tiro.
  - **Plumas-dardo** en abanico, **columnas de fuego** que salen del piso (titilan antes) y **picadas** contra el piso con ondas de choque que hay que saltar. Estos no se atajan: se esquivan.
  - Tiene **10 de vida** (barra abajo en el centro). A la mitad se enoja y va más rápido.
  - En la pelea el jetpack dura muy poquito y tiene poca fuerza, y hay un techo invisible: no se puede escapar volando.
  - Si te noquean, te desmayás y aparecés en casa (con una pluma violeta en la almohada): hay que volver a bajar y Aguilus se recupera del todo. Cuando llegás de nuevo, te gasta con una charla distinta según cuántas veces te ganó.
  - Después de ganarle, en la pausa aparece **Volver a pelear con Aguilus** para repetir la pelea.
- **Final:** Aguilus queda tirado, se rinde y les ruega que no lo dejen ahí abajo. Se abrazan los tres, salen volando por el pozo del cantero y aterrizan sobre las baldosas al lado del arbolito, donde Aguilus jadea, se recompone y se va volando. Termina con un chiste con Carlos y el cartel de fin.
- Los guiones están en [`src/boss.js`](src/boss.js) (`encounterScript` y `victoryScript`); el sprite de Aguilus, en [`src/aguilus.js`](src/aguilus.js).
- El medidor de la derecha marca la profundidad y dónde están los regalos.
- La música cambia con la profundidad: tres canciones para la superficie (hasta 300 m), tres para la zona media (300 a 800 m), tres para lo profundo (800 a 1500 m) y tres de combate final en el núcleo. Dentro de cada zona se alternan al azar, con fundidos entre una y otra. Cada vuelta de una canción suena distinta: la primera arranca sin batería, después entran una segunda voz que armoniza y los arpegios, hay redobles al final de cada vuelta y muchas suben un tono en la última. Hay varios instrumentos (cuadrada, campana, cuerda pulsada, coro, sierra épica) y ritmos (cumbia, latido, galope de batalla). Están escritas en texto en [`src/music.js`](src/music.js).
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
sandbox.html      redirige al sandbox (`?sandbox`)
styles.css        estilos de la interfaz
server.js         servidor local sin dependencias
src/
  main.js         loop del juego, estados, eventos (taller, cofres, desmayos)
  scene.js        motor de escenas: actores, cámara con zoom, diálogos
  intro.js        guión de la cinemática de inicio y la nota
  boss.js         Aguilus: encuentro, pelea con rocas de magma y final
  aguilus.js      sprite de Aguilus (más alto, con báculo y poses)
  sandbox.js      sandbox para ver los personajes (Pablo, Panchi, Carlos y Aguilus) y la casa rodante
  config.js       todos los números y textos ajustables
  world.js        generación del mundo, cavado libre (terreno de 2 px), render por chunks
  tiles.js        tipos de bloque y texturas pixel art
  structures.js   edificio, departamento, escalera, casa rodante del taller (con Carlos), paredón, portón y patio
  sprites.js      personajes, tesoros, cofre, perro, íconos, fuente pixel
  player.js       física, cavado, jetpack, energía, caídas, animación
  background.js   cielo, nubes, barrio, costa y mar
  lighting.js     oscuridad del subsuelo y luces
  popi.js         Popi, el perro compañero (seguir, volar, ayudar a cavar)
  buddy.js        IA del compañero (sigue, vuela y ayuda a cavar)
  chatter.js      charlas entre Pablo y Panchi cada 120 m (burbujas de diálogo)
  net.js          jugar online de a dos (sala con código, sincronización)
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
