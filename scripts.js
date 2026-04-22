const harvestOrange = "#F17300";
/**
 * Data Catalog Project Starter Code - SEA Stage 2
 *
 * This file is where you should be doing most of your work. You should
 * also make changes to the HTML and CSS files, but we want you to prioritize
 * demonstrating your understanding of data structures, and you'll do that
 * with the JavaScript code you write in this file.
 *
 * The comments in this file are only to help you learn how the starter code
 * works. The instructions for the project are in the README. That said, here
 * are the three things you should do first to learn about the starter code:
 * - 1 - Change something small in index.html or style.css, then reload your
 *    browser and make sure you can see that change.
 * - 2 - On your browser, right click anywhere on the page and select
 *    "Inspect" to open the browser developer tools. Then, go to the "console"
 *    tab in the new window that opened up. This console is where you will see
 *    JavaScript errors and logs, which is extremely helpful for debugging.
 *    (These instructions assume you're using Chrome, opening developer tools
 *    may be different on other browsers. We suggest using Chrome.)
 * - 3 - Add another string to the titles array a few lines down. Reload your
 *    browser and observe what happens. You should see a fourth "card" appear
 *    with the string you added to the array, but a broken image.
 *
 */

// Stolen from Coolors
const veryDarkGray = "#111111";
const cardGray = "#222222";
const white = "#FFFFFF";

const unitMap = {
    'Horsepower': ' hp',
    'Torque': ' lb-ft',
    'Range': ' mi',
    'Battery Capacity': ' kWh',
    'Peak Charging': ' kW',
    'Length': ' in'
};

let carsDatabase = [];
let loadedCars = [];
let isKilometers = false;
let showBest = false;
let activeRenderers = [];

// I could have used static images but I thought this would be cooler. Not super performant tho
function init3DModel(container, modelName) {
    const scene = new THREE.Scene();
    scene.background = null;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const width = container.clientWidth || 270;
    const height = container.clientHeight || 250;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;

    let modelObject = null;
    const loader = new THREE.GLTFLoader();
    loader.load(`assets/models/${modelName}/scene.gltf`, function(gltf) {
        modelObject = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(modelObject);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.5 / maxDim;
        modelObject.scale.setScalar(scale);
        
        modelObject.position.sub(center.multiplyScalar(scale));
        modelObject.position.y -= size.y * scale * 0.2;
        
        scene.add(modelObject);
    });

    let requestID;
    function animate() {
        requestID = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    activeRenderers.push({ renderer, requestID });
}

const appContainer = document.getElementById("appContainer");
const comparisonContainer = document.getElementById("comparisonContainer");
const topBar = document.getElementById("topBar");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const unitToggle = document.getElementById("unitToggle");
const bestToggle = document.getElementById("bestToggle");

/*
    This will not work if you are just opening the index.html file.
    I only did it this way because it was reallty easy for me to scale.
*/
fetch('data.csv')
    .then(res => res.text())
    .then(csvData => {
        const lines = csvData.trim().split('\n');
        const rows = lines.map(line => line.split(',').map(s => s.trim()));
        const carNames = rows[0].slice(1);
        
        carsDatabase = carNames.map((name, index) => {
            const car = { id: index + 1, model: name, make: "", specs: [] };
            for(let i=1; i<rows.length; i++) {
                const key = rows[i][0];
                const value = rows[i][index + 1];
                if (key.toLowerCase() === 'brand') {
                    car.make = value;
                } else {
                    car.specs.push({ label: key, value: value });
                }
            }
            return car;
        });
        
        renderSearchResults("");
    });

unitToggle.onchange = (e) => {
    isKilometers = e.target.checked;
    renderComparison();
};

bestToggle.onchange = (e) => {
    showBest = e.target.checked;
    renderComparison();
};

function renderComparison() {
    comparisonContainer.innerHTML = "";
    
    let bestValues = {};
    if (showBest && loadedCars.length > 1) {
        loadedCars[0].specs.forEach(spec => {
            let maxVal = -Infinity;
            loadedCars.forEach(c => {
                let s = c.specs.find(x => x.label === spec.label);
                if (s) {
                    let num = parseFloat(s.value);
                    if (!isNaN(num) && num > maxVal) {
                        maxVal = num;
                    }
                }
            });
            bestValues[spec.label] = maxVal;
        });
    }

    loadedCars.forEach(car => {
        const card = document.createElement("div");
        card.className = "carCard";
        card.style.backgroundColor = cardGray;
        
        const modelContainer = document.createElement("div");
        modelContainer.className = "modelContainer";
        card.appendChild(modelContainer);
        
        const title = document.createElement("h2");
        title.textContent = `${car.model}`;
        title.style.color = harvestOrange;
        
        card.appendChild(title);
        
        car.specs.forEach(spec => {
            const row = document.createElement("div");
            row.className = "specRow";
            
            const label = document.createElement("span");
            label.textContent = spec.label;
            label.style.color = white;
            
            const value = document.createElement("span");
            let finalValue = spec.value;
            let finalUnit = unitMap[spec.label] || '';
            
            if (spec.label === 'Range' && isKilometers) {
                finalValue = Math.round(parseFloat(spec.value) * 1.6);
                finalUnit = ' km';
            }
            
            value.textContent = finalValue + finalUnit;
            
            const numVal = parseFloat(spec.value);
            if (showBest && loadedCars.length > 1 && !isNaN(numVal) && numVal === bestValues[spec.label]) {
                value.style.color = harvestOrange;
                value.style.fontWeight = "bold";
            } else {
                value.style.color = white;
                value.style.fontWeight = "normal";
            }
            
            row.appendChild(label);
            row.appendChild(value);
            card.appendChild(row);
        });
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "removeCarBtn";
        removeBtn.textContent = "×";
        removeBtn.style.color = harvestOrange;
        removeBtn.onclick = () => {
            loadedCars = loadedCars.filter(c => c.id !== car.id);
            renderComparison();
            renderSearchResults(searchInput.value);
        };
        
        card.appendChild(removeBtn);
        comparisonContainer.appendChild(card);
        
        init3DModel(modelContainer, car.model);
    });
}

searchInput.style.backgroundColor = cardGray;
searchInput.style.color = white;

searchResults.style.backgroundColor = cardGray;

searchInput.onfocus = () => {
    searchResults.classList.remove("hidden");
    renderSearchResults(searchInput.value);
};

document.onclick = (e) => {
    if (e.target !== searchInput && e.target !== searchResults && !searchResults.contains(e.target)) {
        searchResults.classList.add("hidden");
    }
};

searchInput.oninput = (e) => {
    searchResults.classList.remove("hidden");
    renderSearchResults(e.target.value);
};

function renderSearchResults(query) {
    searchResults.innerHTML = "";

    // Uncessiary to do it this way but I think having it lower case is nicer.
    const lowerQuery = query.toLowerCase();
    const filteredCars = carsDatabase.filter(car => 
        (car.make.toLowerCase().includes(lowerQuery) || car.model.toLowerCase().includes(lowerQuery)) &&
        !loadedCars.find(c => c.id === car.id)
    );
    
    if (filteredCars.length === 0) {
        const li = document.createElement("li");
        li.className = "searchResultItem";
        li.textContent = "No results found";
        li.style.color = white;
        searchResults.appendChild(li);
        return;
    }
    
    filteredCars.forEach(car => {
        const li = document.createElement("li");
        li.className = "searchResultItem";
        li.textContent = `${car.model}`;
        li.style.color = white;
        
        li.onmouseenter = () => {
            li.style.backgroundColor = harvestOrange;
        };
        li.onmouseleave = () => {
            li.style.backgroundColor = "transparent";
        };
        
        li.onmousedown = (e) => {
            e.preventDefault();
            loadedCars.push(car);
            searchInput.value = "";
            searchResults.classList.add("hidden");
            renderComparison();
            renderSearchResults("");
        };
        searchResults.appendChild(li);
    });
}

document.body.style.backgroundColor = veryDarkGray;
document.body.style.color = white;
topBar.style.backgroundColor = veryDarkGray;
