# minecraft.js

This is an experiment adapted from Notch's Javascript Minecraft <a href="http://jsfiddle.net/2yr59/23/">renderer</a>, but extended with new aditions, like random terrain generation, fog and fake shadows, possibility to navigate and look over the generated landmark. 

As a fundation is using the simplex noise random seed distribution algorithm. For the Javascript port of simplex noise algorithm check <a href="https://github.com/esimov/simplexnoise.js">simplexnoise.js</a>.

![Screenshot](https://raw.githubusercontent.com/esimov/minecraft.js/master/assets/screenshot.png)

#### [Live demo](https://www.esimov.com/experiments/javascript/minecraft_v2/)

### Features
- Highly adaptive
- Customizable
- Using fake shadow and fog for generating atmospheric environment
- Posibility to navigate through the map (hovevery this is somehow limited)
- You can look around and change the altitude of the camera with the mouse
- You can play with with the sliders from the side panel to generate different maps and environments

### How to run
- `npm install` to install the `node-static` package
- `node app.js` to run the server
- `localhost:3000` to run in the browser

If you wish to change the default seed distribution you can change the code below:

```javascript
for (var pixel = 0; pixel < noise.length; pixel += 4) {
    var x = (pixel / 4) % ww;
    var y = Math.floor(pixel / hh / 4);
    x /= ww;
    y /= hh; // normalize
    
    var size = GUI.frequency || 2;  // pick a scaling value
    // add octaves
    var value = Math.floor(
            (simplex.noise(size * x * GUI.x, size * y * GUI.y, 0.1 + GUI.z) +
             simplex.noise(2 * size * x * GUI.x, 2 * size * y * GUI.y, 0.1 + GUI.z) * 0.5)
        * 177);        
    noise[pixel] = noise[pixel + 1] = noise[pixel + 2] = value;
    noise[pixel + 3] = 255;
}
```

If you wish to replace the simplex noise algorithm to Perlin noise you need to change the line below:
```javascript
var simplex = new NOISE.Simplex();
simplex.init();
simplex.noiseDetail(4, 2);
``` 
with 

```javascript
var simplex = new NOISE.Perlin();
simplex.init();
simplex.noiseDetail(4, 2);
```
The Perlin noise algorithm is included in the package.

Running example:
www.esimov.com/experiments/javascript/minecraft_v2/

## Author

* Endre Simo ([@simo_endre](https://twitter.com/simo_endre))

## License

Copyright © 2016 Endre Simo

This software is distributed under the MIT license. See the [LICENSE](https://github.com/esimov/pigo/blob/master/LICENSE) file for the full license text.
