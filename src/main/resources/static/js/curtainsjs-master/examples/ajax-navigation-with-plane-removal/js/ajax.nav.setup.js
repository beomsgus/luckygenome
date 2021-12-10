import {Curtains, Plane, TextureLoader} from '../../../src/index.mjs';

// set up our WebGL context and append the canvas to our wrapper
const curtains = new Curtains({
    container: "canvas",
    pixelRatio: Math.min(1.5, window.devicePixelRatio) // limit pixel ratio for performance
});


let images = [
    "../medias/plane-small-texture-1.jpg",
    "../medias/plane-small-texture-2.jpg",
    "../medias/plane-small-texture-3.jpg",
    "../medias/plane-small-texture-4.jpg",
];

let textures = [];

curtains.onError(() => {
    // we will add a class to the document body to display original images
    document.body.classList.add("no-curtains", "site-loaded");
}).onContextLost(() => {
    // on context lost, try to restore the context
    curtains.restoreContext();

}).onContextRestored(() => {
    // since we have some textures that do not have any parent
    // they won't be automatically restored
    // so restore them after everything else has been restored
    for(let i = 0; i < textures.length; i++) {
        if(!textures[i].hasParent()) {
            textures[i]._restoreContext();
        }
    }
});

function preloadTextures() {
    let percentLoaded = 0;

    const loaderEl = document.getElementById("loader-inner");

    const loader = new TextureLoader(curtains);

    loader.loadImages(images, {}, (texture) => {

        textures.push(texture);

        texture.onSourceLoaded(() => {

        }).onSourceUploaded(() => {
            percentLoaded++;

            loaderEl.innerText = (percentLoaded / images.length) * 100 + "%";

            // we have finished loading our textures
            if(percentLoaded === images.length) {
                document.body.classList.add("site-loaded");
            }
        });
    }, (image, error) => {
        console.warn("there has been an error", error, " while loading this image", image);

        // display site anyway
        document.body.classList.add("site-loaded");
    });
}

preloadTextures();


window.addEventListener("load", () => {
    // resize our curtainsjs container because we instanced it before any dom load event
    curtains.resize();

    // we will keep track of all our planes in an array
    let planes = [];
    let planeElements = [];

    const vs = `
        precision mediump float;

        // default mandatory variables
        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;

        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;

        // texture matrix
        uniform mat4 uTextureMatrix0;

        // custom variables
        varying vec3 vVertexPosition;
        varying vec2 vTextureCoord;

        uniform float uTime;

        void main() {
            vec3 vertexPosition = aVertexPosition;

            float distanceFromCenter = distance(vec2(vertexPosition.x, vertexPosition.y), vec2(0.5, vertexPosition.x));
            vertexPosition.z += 0.05 * cos(5.0 * (distanceFromCenter - (uTime / 100.0)));

            // set positions
            gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

            // varyings
            vTextureCoord = (uTextureMatrix0 * vec4(aTextureCoord, 0.0, 1.0)).xy;
            vVertexPosition = vertexPosition;
        }
    `;

    const fs = `
        precision mediump float;

        varying vec3 vVertexPosition;
        varying vec2 vTextureCoord;

        uniform sampler2D uSampler0;

        void main( void ) {
            // our texture
            gl_FragColor = texture2D(uSampler0, vTextureCoord);
        }
    `;

    // all planes will have the same parameters
    const params = {
        vertexShader: vs, // our vertex shader
        fragmentShader: fs, // our framgent shader
        widthSegments: 30,
        heightSegments: 20,

        autoloadSources: false,

        fov: 35,
        uniforms: {
            time: {
                name: "uTime", // uniform name that will be passed to our shaders
                type: "1f", // this means our uniform is a float
                value: 0,
            },
        }
    };


    // add the right texture to the plane
    function assignTexture(plane) {
        // set the right texture
        const planeImage = plane.htmlElement.querySelector("img");
        const planeTexture = textures.find((element) => element.source && element.source.src === planeImage.src);

        // we got a texture that matches the plane img element, add it
        if(planeTexture) {
            // exactly the same as planeTexture.addParent(plane)
            plane.addTexture(planeTexture);
        }
    }


    // handle all the planes
    function handlePlanes(index) {
        const plane = planes[index];

        // if the textures are already created, proceed
        if(textures.length === images.length) {
            assignTexture(plane);
        }
        else {
            // it's also possible that the planes were created before the textures sources were loaded
            // so we'll use our nextRender method with its keep parameter to true to act as a setInterval
            // once our textures are ready, cancel the nextRender call by setting the keep flag to false
            const waitForTexture = curtains.nextRender(() => {
                if(textures.length === images.length) {
                    // textures are ready, stop executing the callback
                    waitForTexture.keep = false;

                    // assign the texture
                    assignTexture(plane);
                }
            }, true);
        }

        plane.onRender(() => {
            // increment our time uniform
            plane.uniforms.time.value++;
        }).onError(() => {
            // display original HTML image element
            plane.htmlElement.classList.add("no-plane");
        });
    }


    function addPlanes() {
        planeElements = document.getElementsByClassName("plane");

        // if we got planes to add
        if(planeElements.length > 0) {

            for(let i = 0; i < planeElements.length; i++) {
                // add the plane to our array
                //var plane = curtains.addPlane(planeElements[i], params);
                const plane = new Plane(curtains, planeElements[i], params);
                // only push the plane if it exists
                planes.push(plane);

                handlePlanes(i);
            }
        }
    }

    function removePlanes() {
        // remove all planes
        for(let i = 0; i < planes.length; i++) {
            planes[i].remove();
        }

        // reset our arrays
        planes = [];
    }

    addPlanes();


    // a flag to know if we are currently in a transition between pages
    let isTransitioning = false;

    // handle all the navigation process
    function handleNavigation() {

        // button navigation
        const navButtons = document.getElementsByClassName("navigation-button");

        function buttonNavigation(e) {
            // get button index
            let index;
            for(let i = 0; i < navButtons.length; i++) {
                navButtons[i].classList.remove("active");
                if(this === navButtons[i]) {
                    index = i;
                    navButtons[i].classList.add("active");
                }
            }

            // ajax call
            handleAjaxCall(navButtons[index].getAttribute("href"), appendContent);

            // prevent link default behaviour
            e.preventDefault();
        }

        // listen to the navigation buttons click event
        for(let i = 0; i < navButtons.length; i++) {
            navButtons[i].addEventListener("click", buttonNavigation, false);
        }



        // this function will execute our AJAX call and run a callback function
        function handleAjaxCall(href, callback) {
            // set our transition flag
            isTransitioning = true;

            // handling ajax
            const xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {

                    const response = xhr.response;
                    callback(href, response);
                }
            };

            xhr.open("GET", href, true);
            xhr.setRequestHeader("Accept", "text/html");
            xhr.send(null);

            // start page transition
            document.getElementById("page-wrap").classList.add("page-transition");
        }

        function appendContent(href, response) {
            // append our response to a div
            const tempHtml = document.createElement('div');
            tempHtml.insertAdjacentHTML("beforeend", response);

            // let the css animation run
            setTimeout(function() {

                removePlanes();

                let content;
                // manual filtering to get our content
                for(let i = 0; i < tempHtml.children.length; i++) {
                    if(tempHtml.children[i].getAttribute("id") === "page-wrap") {

                        for(let j = 0; j < tempHtml.children[i].children.length; j++) {
                            if(tempHtml.children[i].children[j].getAttribute("id") === "content") {
                                content = tempHtml.children[i].children[j];
                            }
                        }
                    }
                }

                // empty our content div and append our new content
                document.getElementById("content").innerHTML = "";
                document.getElementById("content").appendChild(content.children[0]);

                document.getElementById("page-wrap").classList.remove("page-transition");

                addPlanes();

                // reset our transition flag
                isTransitioning = false;

                history.pushState(null, "", href);
            }, 750);
        }
    }

    handleNavigation();
});
