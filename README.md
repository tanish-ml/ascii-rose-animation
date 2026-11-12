# ROSA MATHEMATICA 3D — Parametric ASCII Rose Observatory

> **Live Interactive Web Application (GitHub Pages):** [**https://tanish-ml.github.io/ascii-rose-animation/**](https://tanish-ml.github.io/ascii-rose-animation/)

A real-time, **3D Z-buffered parametric ASCII rose animation** and botanical morphogenesis observatory built with pure vanilla JavaScript, HTML5 High-DPI Canvas, and procedural WebAudio synthesis.

```text
                            + == = *=**x*x*x*xxxxx*
                           \=\| \__\ |~|~/+_+_+|~| _ _
                         \\===_\| | \|~|_/+/+_+/_____\_/
                        \+++=\;|\_|_||~|~|+|/+_+\+\_✦+\/_/
                       \++++\;\|;\\_|__|~|~||+_+\_|+|_\/+_/
                      \~~~~\;\++_\;\|~||~|~||~_~|+|__\_✦/*//          ·  °
                      |~~~~:✦:~✦\:\+__+__\;/\~_~/__|~|~\~=||
                      |;;;;✦:~~\:\_\:||;|_;||;_;++_\__;_;==|/ ·
                      |;;;;;;;;;\\:|\~~_:✦;/++_;+|;/|;/;+=|;|
            ✧         /::✦::;;;;;;\;~~~~~:~~\+~~_\;/|;_;++\;|
                       /::::::::;;;;;;;~~~~~:~~~:~~_\\:~_|;\\
                        /:::::::::::;;;;;;~\:~~~_~\:\:_|:/*|
                         ///:::·::::;;;;;;_:;;;\:/\:~|:_:_\\ ° °
                            //:··::::::;;;:;;;;:|::__\:_\\\
                              //···:_:::;;;;;_/✧:;\::_\\/
                                /___·_:::;;_\::::/:\\:\\;////∙
                                \__x~/··/\~/·+++~;~|\:/\|:\\   ✧
                               //__+=~_/__/;/______\····|\
                                 /_;;::·///∙:~~_\:·_____\
                                   /____\  |#$|·:_*      _  _
                                          \*&$\_\___\__/\_/    |
                                          \+&| /:;::_________//
                                         \;X&;\:/__\ \  _ _  /_\
                                        |_\=*|/\
                                          |\/|           ✧
                                          |;/\
                            \_//✧_//      \*x|  ∙
                            \~:;___/\//__|xX|
                           //__\ \ _ //\\=*x\
                                 _ /__\  |&|
                                   _   \_=#|
                                     ||_x*#|
                                        |*#|
                                        |X#x_/
                                        *=&~_~|
```

---

## ✨ Key Architectural Features

### 1. Three Switchable 3D Mathematical Rose Engines (`rose-math.js`)
- **I. Román Cortés Botanical Rose (24-Petal JS1k Surface)**: Re-engineered from the legendary 2012 JS1k 1KB procedural rose into a true 3D Euclidean coordinate space with 24 individually articulated petals, 5 reflexed calyx sepals, a bulbous receptacle, a curved stem with 6 hooked *Rosa canina* thorns, and 2 compound-inspired serrated leaves with pinnate venation.
- **II. Paul Nylander Logarithmic Spiral Rose ($15\pi$)**: Evaluates Nylander's continuous exponential-spiral surface:
  $$\phi(\theta) = \phi_{\max}(\beta) \cdot \exp\left(-\frac{\theta}{8\pi}\right), \quad X(\theta) = 1 - \frac{1}{2}\left(\frac{5}{4}\left(1 - \frac{\bmod(3.6\theta, 2\pi)}{\pi}\right)^2 - \frac{1}{4}\right)^2$$
- **III. Sacred Tudor Fibonacci Rose**: A 36-petal phyllotaxis rose arranged at the golden divergence angle $\Delta\theta = \pi(3 - \sqrt{5}) \approx 137.50776^\circ$ with a glowing central stamen corona.

### 2. Z-Buffered Normal & Crease-Aware ASCII Rasterizer (`ascii-renderer.js`)
- **True 3D Perspective & Surface Normals**: Computes finite-difference surface normals $\mathbf{n} = \text{normalize}(\partial_u \mathbf{S} \times \partial_v \mathbf{S})$ for over 15,000 3D surface elements per frame.
- **Overlapping Petal Crease Detection**: Inspects Z-buffer depth discontinuities and petal layer IDs in screen space to render directional contour strokes (`/`, `\`, `|`, `_`) along overlapping petal rims while shading deep velvet inner folds with ambient occlusion.
- **3D Tumbling Falling Petals & Bioluminescent Pollen**: Detached rose petals are rendered as curved $5\times 5$ 3D surface patches that tumble with aerodynamic lift and pass behind/in front of the stem inside the shared Z-buffer.
- **8 Chromatic Palettes & 7 Glyph Topology Ramps**: Including *Crimson Velvet*, *Midnight Bioluminescence*, *Alchemist's Gold*, *Ghost Sakura*, *P1 Phosphor Terminal*, *Black Baccara Noir*, *Infrared Thermal*, and *Sumi-e & Cinnabar*, paired with *Botanical*, *Poetic ("Rose is a rose")*, *Cyber-Katakana*, *Braille Stipple*, *ANSI Blocks*, *Sacred Geometry*, and *Architectural Contour* ramps.

### 3. Procedural WebAudio Botanical Synthesizer (`audio-engine.js`)
- Zero external audio files — synthesizes a warm 4-voice Lydian ambient drone pad whose resonant low-pass filter cutoff opens and closes with the rose's **Bloom Unfurl ($\beta$)** state, accompanied by stereo-panned FM glass-harp chimes when wind gusts scatter petals.

---

## 🎮 Interactive Controls & Shortcuts

| Input / Shortcut | Action |
| :--- | :--- |
| **Left-Drag / Touch** | 3D Orbit Camera around the rose (with smooth angular inertia) |
| **Scroll / Pinch** | Zoom camera in/out |
| **Shift+Drag / Right-Drag** | Pan 3D viewport |
| **Double-Click** | Trigger a 3D Petal Burst & recenter camera |
| **`1` / `2` / `3`** | Switch between *Cortés*, *Nylander*, and *Fibonacci* 3D models |
| **`W` or `G`** | Trigger a Gust of Wind (releases 14 tumbling 3D ASCII petals) |
| **`M`** | Toggle Procedural Lydian WebAudio Synthesizer |
| **`C`** | Copy current 3D ASCII frame as raw text to clipboard |
| **`H` or `Z`** | Toggle fullscreen **Zen Mode** (hides all HUD overlays) |
| **`Space`** | Pause / Resume animation & turntable |

---

## 🧪 Running Verification Tests

```bash
node test.js
```
