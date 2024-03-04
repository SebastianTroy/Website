class Widget {
    constructor(millisecondsPerTick, context) {
        this.lastTime = 0.0;
        this.context = context;
        this.millisecondsPerTick = millisecondsPerTick || 1000 / 60;
    }

    reset() {
        throw new Error("Not implemented");
    }

    draw() {
        throw new Error("Not implemented");
    }

    tick() {
        throw new Error("Not implemented");
    }

    nextFrame(deltaTime) {
        this.lastTime += deltaTime;
        if (this.lastTime > this.millisecondsPerTick) {
            this.lastTime = 0;
            this.tick();
        }
    }
}

class ConwaysGameOfLife extends Widget {
    constructor(millisecondsPerTick, context, cellsPerVmin, proportionAliveOnReset, cellColor) {
        super(millisecondsPerTick, context);
        this.cells = [];

        this.cellsPerVmin = cellsPerVmin || 50;
        this.proportionAliveOnReset = proportionAliveOnReset || 0.1;
        this.cellColor = cellColor || "rgba(255, 255, 255, 0.1)";
    }

    reset() {
        this.cellSize = Math.min(this.context.canvas.width, this.context.canvas.height) / this.cellsPerVmin;
        this.gridWidth = Math.floor(this.context.canvas.width / this.cellSize);
        this.gridHeight = Math.floor(this.context.canvas.height / this.cellSize);
        this.cells = Array.from({ length: this.gridWidth }, () => Array.from({ length: this.gridHeight }, () => Math.random() <= this.proportionAliveOnReset));
        // Tick a couple of times to get the cells into a more interesting state
        this.tick();
        this.tick();
    }

    draw() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        this.context.fillStyle = this.cellColor;
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if (this.cells[x][y]) {
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    tick() {
        // map (rather than for each) creates a new array, so we don't modify the current state while we're iterating over it
        this.cells = this.cells.map((row, x) =>
            row.map((cell, y) => {
                const neighbours = [
                    this.cells[x - 1]?.[y - 1], //
                    this.cells[x]?.[y - 1],
                    this.cells[x + 1]?.[y - 1],
                    this.cells[x - 1]?.[y],
                    this.cells[x + 1]?.[y],
                    this.cells[x - 1]?.[y + 1],
                    this.cells[x]?.[y + 1],
                    this.cells[x + 1]?.[y + 1],
                ].filter(Boolean).length;
                if (cell) {
                    return neighbours === 2 || neighbours === 3;
                } else {
                    return neighbours === 3;
                }
            })
        );
    }
}

class Boids extends Widget {
    constructor(millisecondsPerTick, context, boidColour) {
        super(millisecondsPerTick, context);
        this.boids = [];
        this.boidCount = 0;
        this.boidSpeed = 10;
        this.boidPerception = 50;
        this.boidAvoidance = 10;
        this.boidAlignment = 0.2;
        this.boidCohesion = 0.001;
        this.boidColour = boidColour || "rgba(255, 255, 255, 0.25)";

        this.boidShape = new Path2D();
        this.boidShape.moveTo(0, -10);
        this.boidShape.lineTo(5, 10);
        this.boidShape.lineTo(-5, 10);
        this.boidShape.closePath();
    }

    reset() {
        this.boidCount = (this.context.canvas.width * this.context.canvas.height) / 5000;
        this.boids = Array.from({ length: this.boidCount }, () => {
            return {
                x: Math.random() * this.context.canvas.width,
                y: Math.random() * this.context.canvas.height,
                xSpeed: (Math.random() - 0.5) * this.boidSpeed,
                ySpeed: (Math.random() - 0.5) * this.boidSpeed,
            };
        });
    }

    draw() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        this.context.fillStyle = this.boidColour;
        for (let boid of this.boids) {
            this.context.save();
            this.context.translate(boid.x, boid.y);
            let angle = Math.atan2(boid.ySpeed, boid.xSpeed) + Math.PI / 2;
            this.context.rotate(angle);
            this.context.fill(this.boidShape);
            this.context.restore();
        }
    }

    tick() {
        for (let boid of this.boids) {
            let perceivedCenter = { x: 0, y: 0 };
            let perceivedSpeed = { x: 0, y: 0 };
            let perceivedSeparation = { x: 0, y: 0 };
            let numNeighbours = 0;
            for (let otherBoid of this.boids) {
                if (otherBoid === boid) continue;
                let distance = Math.sqrt((boid.x - otherBoid.x) ** 2 + (boid.y - otherBoid.y) ** 2);
                if (distance < this.boidPerception) {
                    perceivedCenter.x += otherBoid.x;
                    perceivedCenter.y += otherBoid.y;
                    perceivedSpeed.x += otherBoid.xSpeed;
                    perceivedSpeed.y += otherBoid.ySpeed;
                    if (distance < this.boidAvoidance) {
                        perceivedSeparation.x -= otherBoid.x - boid.x;
                        perceivedSeparation.y -= otherBoid.y - boid.y;
                    }
                    numNeighbours++;
                }
            }
            if (numNeighbours > 0) {
                perceivedCenter.x /= numNeighbours;
                perceivedCenter.y /= numNeighbours;
                perceivedSpeed.x /= numNeighbours;
                perceivedSpeed.y /= numNeighbours;
                perceivedCenter.x = (perceivedCenter.x - boid.x) * this.boidCohesion;
                perceivedCenter.y = (perceivedCenter.y - boid.y) * this.boidCohesion;
                perceivedSpeed.x = (perceivedSpeed.x - boid.xSpeed) * this.boidAlignment;
                perceivedSpeed.y = (perceivedSpeed.y - boid.ySpeed) * this.boidAlignment;
                perceivedSeparation.x *= this.boidAvoidance;
                perceivedSeparation.y *= this.boidAvoidance;
            }
            boid.xSpeed += perceivedCenter.x + perceivedSpeed.x + perceivedSeparation.x;
            boid.ySpeed += perceivedCenter.y + perceivedSpeed.y + perceivedSeparation.y;
            let speed = Math.sqrt(boid.xSpeed ** 2 + boid.ySpeed ** 2);
            if (speed > this.boidSpeed) {
                boid.xSpeed = (boid.xSpeed / speed) * this.boidSpeed;
                boid.ySpeed = (boid.ySpeed / speed) * this.boidSpeed;
            }
            boid.x += boid.xSpeed;
            boid.y += boid.ySpeed;
            if (boid.x < 0) boid.x = this.context.canvas.width;
            if (boid.x > this.context.canvas.width) boid.x = 0;
            if (boid.y < 0) boid.y = this.context.canvas.height;
            if (boid.y > this.context.canvas.height) boid.y = 0;
        }
    }
}

class FlappyBird extends Widget {
    static Pipe = class {
        constructor(x, width, gapY, gapSize) {
            this.x = x;
            this.width = width;
            this.gapY = gapY;
            this.gapSize = gapSize;
        }

        getGapRect() {
            return { x: this.x - 1, y: this.gapY, width: this.width + 2, height: this.gapSize };
        }
    };

    constructor(millisecondsPerTick, context) {
        super(millisecondsPerTick, context);
        this.bird = {};
        this.pipes = [];
        this.pipeWidth = 0;
        this.gapSize = 0;
        this.pipeSpeed = 0;
        this.pipeSpacing = 0;
        this.gravity = 0;
        this.jumpStrength = 0;
        this.maxPipes = 0;
    }

    reset() {
        // Adjust gapSize and birdSize based on canvas height
        this.gapSize = this.context.canvas.height / 4;
        this.bird = { x: this.context.canvas.width / 2, y: 0, ySpeed: 0, radius: this.gapSize / 15 };
        this.jumpStrength = this.gapSize / 20;
        this.gravity = this.jumpStrength / 10;

        // Adjust pipeWidth, pipeSpacing, and pipeSpeed based on canvas width
        this.pipeWidth = Math.min(50, this.context.canvas.width / 20);
        this.pipeSpacing = this.context.canvas.width / 10;

        // Base the pipe speed on the pipe spacing, so it is consistent across different canvas sizes
        this.pipeSpeed = this.pipeSpacing / 50;

        // Calculate maxPipes to fill the whole width with pipes
        this.maxPipes = Math.ceil(this.context.canvas.width / (this.pipeWidth + this.pipeSpacing));

        // Initialize pipes
        this.pipes = [];
        while (this.pipes.length < this.maxPipes) {
            this.addPipe();
        }

        // Set bird's y-coordinate to middle of the next gap
        if (this.pipes.length > 0) {
            this.bird.y = this.nextPipe().gapY + this.gapSize / 2;
        }
    }

    draw() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        for (let pipe of this.pipes) {
            this.context.fillStyle = "rgba(0, 205, 0, 0.2)";
            this.context.fillRect(pipe.x, 0, this.pipeWidth, this.context.canvas.height);
            this.context.fillStyle = "black";
            this.context.fillRect(pipe.getGapRect().x, pipe.getGapRect().y, pipe.getGapRect().width, pipe.getGapRect().height);
        }
        this.context.fillStyle = "rgba(255, 255, 255, 0.2)";
        this.context.beginPath();
        this.context.arc(this.bird.x, this.bird.y, this.bird.radius, 0, Math.PI * 2);
        this.context.fill();
    }

    tick() {
        for (let pipe of this.pipes) {
            pipe.x -= this.pipeSpeed;
        }
        this.pipes = this.pipes.filter((pipe) => pipe.x + this.pipeWidth > 0);

        if (this.pipes.length < this.maxPipes) {
            this.addPipe();
        }

        this.bird.ySpeed += this.gravity;
        // clamp the bird's speed to a maximum
        this.bird.ySpeed = Math.min(this.bird.ySpeed, this.jumpStrength);

        this.bird.y += this.bird.ySpeed;
        let pipe = this.nextPipe();
        // if the bird is inside a gap
        if (pipe && this.bird.x > pipe.x && this.bird.x < pipe.x + pipe.width) {
            // if the bird is about to hit the bottom of the gap, jump
            if (this.bird.y + this.bird.radius > pipe.gapY + pipe.gapSize * 0.75) {
                this.jump();
            }
        } else if (this.bird.y > this.context.canvas.height * 0.9 || (pipe && this.bird.y > pipe.gapY + pipe.gapSize * 0.75)) {
            // if the bird is below the gap, jump
            this.jump();
        }
    }

    addPipe() {
        let gapY = Math.random() * (this.context.canvas.height - this.gapSize);
        // if gap too close to top or bottom, shift it in slightly
        if (gapY < this.context.canvas.height * 0.1) gapY += this.context.canvas.height * 0.1;
        if (gapY + this.gapSize > this.context.canvas.height * 0.9) gapY -= this.context.canvas.height * 0.1;
        // Next pipe should be spaced correctly behind the previous pipe
        let lastPipe = this.pipes[this.pipes.length - 1];
        // If there isn't a last pipe, then we want to add one to the left, to trigger the spawning of pipes accross the whole screen
        let x = lastPipe ? lastPipe.x + this.pipeWidth + this.pipeSpacing : this.pipeWidth;
        this.pipes.push(new FlappyBird.Pipe(x, this.pipeWidth, gapY, this.gapSize));
    }

    nextPipe() {
        return this.pipes.find((pipe) => pipe.x + pipe.width > this.bird.x - this.bird.radius);
    }

    jump() {
        this.bird.ySpeed = -this.jumpStrength;
    }
}

attachListener(document, "DOMContentLoaded", function () {
    const canvas = document.getElementById("simulation");
    const context = canvas.getContext("2d");

    const widgets = [
        new FlappyBird(1000 / 60, context),
        new ConwaysGameOfLife(1000 / 5, context),
        new Boids(1000 / 60, context),
    ];
    const widgetPlayDuration = 20000;

    let now = Date.now() - widgetPlayDuration;
    let currentWidgetPlayTime = 0.0;
    let currentWidgetIndex = 0;
    function draw() {
        let deltaTime = Date.now() - now;
        now = Date.now();
        currentWidgetPlayTime += deltaTime;
        if (currentWidgetPlayTime > widgetPlayDuration) {
            currentWidgetPlayTime = 0;
            currentWidgetIndex = (currentWidgetIndex + 1) % widgets.length;
            widgets[currentWidgetIndex].reset();
        }

        widgets[currentWidgetIndex].nextFrame(deltaTime);
        widgets[currentWidgetIndex].draw();
        requestAnimationFrame(draw);
    }

    attachListener(window, "keydown", function (event) {
        if (event.key === " ") {
            event.preventDefault();
            widgets[currentWidgetIndex].jump();
        }
    });

    attachListener(window, "load", function () {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        draw();
    });

    attachListener(window, "resize", function () {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        widgets[currentWidgetIndex].reset();
    });
});
