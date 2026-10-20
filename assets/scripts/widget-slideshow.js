let backgroundColor = "black";
let highlightColor = "white";
// For small details drawn over the highlight colour, such as the maze's route and the harmonograph's pen
let accentColor = "grey";

// Respect the "reduce motion" accessibility setting: no Flappy Bird, and everything else slower
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionScale = reducedMotion ? 0.25 : 1;

// Catch up on at most this many ticks per frame, so a slow frame can't snowball
const maxTicksPerFrame = 5;

class Widget {
    constructor(name, millisecondsPerTick, context) {
        this.name = name;
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

    mouseMoved(x, y, mouseDown) {
        // Do nothing by default
    }

    mouseClick(x, y) {
        // Do nothing by default
    }

    nextFrame(deltaTime) {
        // Keep the leftover time, so the speed doesn't depend on the frame rate
        this.lastTime = Math.min(this.lastTime + deltaTime, this.millisecondsPerTick * maxTicksPerFrame);
        while (this.lastTime >= this.millisecondsPerTick) {
            this.lastTime -= this.millisecondsPerTick;
            this.tick();
        }
    }
}

class ConwaysGameOfLife extends Widget {
    constructor(millisecondsPerTick, context, cellsPerVmin, proportionAliveOnReset, cellColor) {
        super("Conway's Game of Life", millisecondsPerTick, context);
        this.cells = [];

        this.cellsPerVmin = cellsPerVmin || 50;
        this.proportionAliveOnReset = proportionAliveOnReset || 0.1;
        // Colours left unset follow the theme, which can change while the page is open
        this.cellColor = cellColor;
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
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        this.context.fillStyle = this.cellColor || highlightColor;
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

    mouseMoved(x, y, mouseDown) {
        if (mouseDown) {
            let cellX = Math.floor(x / this.cellSize);
            let cellY = Math.floor(y / this.cellSize);
            if (cellX >= 0 && cellX < this.gridWidth && cellY >= 0 && cellY < this.gridHeight) {
                this.cells[cellX][cellY] = true;
            }
        }
    }
}

class Boids extends Widget {
    constructor(millisecondsPerTick, context, boidColour, boidDensity) {
        super("Boids", millisecondsPerTick, context);
        this.boids = [];
        this.boidDensity = boidDensity || 0.05;
        this.boidSpeed = 0;
        this.boidPerception = 0;
        this.boidAvoidance = 10;
        this.boidAlignment = 0.2;
        this.boidCohesion = 0.001;
        this.boidColour = boidColour;
        this.boidShape = {};
    }

    reset() {
        let boidBaseLength = Math.min(this.context.canvas.width, this.context.canvas.height) / 50;
        let boidHeight = 2 * boidBaseLength;
        this.boidShape = new Path2D();
        this.boidShape.moveTo(0, -boidHeight / 2);
        this.boidShape.lineTo(boidBaseLength / 2, boidHeight / 2);
        this.boidShape.lineTo(-boidBaseLength / 2, boidHeight / 2);
        this.boidShape.closePath();

        this.boidSpeed = (Math.min(this.context.canvas.width, this.context.canvas.height) / 50) * motionScale;
        this.boidPerception = boidHeight * 2.5;
        this.boidAvoidance = this.boidPerception / 5;

        // Boids are isosceles triangles, but approximate them as circles for density calculation
        let boidArea = Math.PI * (boidHeight / 2) ** 2;
        let boidCount = ((this.context.canvas.width * this.context.canvas.height) / boidArea) * this.boidDensity;
        this.boids = Array.from({ length: boidCount }, () => {
            return {
                x: Math.random() * this.context.canvas.width,
                y: Math.random() * this.context.canvas.height,
                xSpeed: (Math.random() - 0.5) * this.boidSpeed,
                ySpeed: (Math.random() - 0.5) * this.boidSpeed,
            };
        });
    }

    draw() {
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        this.context.fillStyle = this.boidColour || highlightColor;
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

    mouseClick(x, y) {
        // Make nearby boids scatter
        for (let boid of this.boids) {
            let distance = Math.sqrt((boid.x - x) ** 2 + (boid.y - y) ** 2);
            if (distance < this.boidPerception * 3) {
                boid.xSpeed += (boid.x - x) * 1.5;
                boid.ySpeed += (boid.y - y) * 1.5;
            }
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
        super("Flappy Bird", millisecondsPerTick, context);
        this.bird = {};
        this.pipes = [];
        this.pipeWidth = 0;
        this.gapSize = 0;
        this.pipeSpeed = 0;
        this.pipeSpacing = 0;
        this.gravity = 0;
        this.jumpStrength = 0;
        this.maxPipes = 0;
        this.autoplay = true;
    }

    reset() {
        this.autoplay = true;

        // Adjust gapSize and birdSize based on canvas height
        this.gapSize = this.context.canvas.height / 4;
        this.bird = { x: this.context.canvas.width / 2, y: 0, ySpeed: 0, radius: this.gapSize / 15 };
        this.jumpStrength = this.gapSize / 20;
        this.gravity = this.jumpStrength / 10;

        // Adjust pipeWidth, pipeSpacing, and pipeSpeed based on canvas width
        this.pipeWidth = Math.min(50 * window.devicePixelRatio, this.context.canvas.width / 20);
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
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        for (let pipe of this.pipes) {
            this.context.fillStyle = "rgba(0, 205, 0, 0.2)";
            this.context.fillRect(pipe.x, 0, this.pipeWidth, this.context.canvas.height);
            this.context.fillStyle = backgroundColor;
            this.context.fillRect(pipe.getGapRect().x, pipe.getGapRect().y, pipe.getGapRect().width, pipe.getGapRect().height);
        }
        this.context.fillStyle = highlightColor;
        this.context.beginPath();

        this.context.save();
        this.context.translate(this.bird.x, this.bird.y);
        let speedRatio = this.bird.ySpeed / this.gravity;
        speedRatio = Math.max(Math.min(speedRatio, 1), -1);
        let rotation = (speedRatio * 10 * Math.PI) / 180;
        this.context.rotate(rotation);
        this.context.fillRect(-this.bird.radius, -this.bird.radius, this.bird.radius * 2, this.bird.radius * 2);

        this.context.restore();
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
        if (this.autoplay) {
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
        } else {
            // if the bird is outside the canvas, reset
            if (this.bird.y > this.context.canvas.height || this.bird.y < 0) {
                this.reset();
            }
            if (!pipe) {
                return;
            }
            // if the bird is colliding with pipe, reset
            const pipeCollideLeft = pipe.x;
            const pipeCollideRight = pipe.x + pipe.width;
            if (this.bird.x > pipeCollideLeft && this.bird.x < pipeCollideRight) {
                const pipeCollideTop = pipe.gapY + this.bird.radius;
                const pipeCollideBottom = pipe.gapY + pipe.gapSize - this.bird.radius;
                if (this.bird.y < pipeCollideTop || this.bird.y > pipeCollideBottom) {
                    this.reset();
                }
            }
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

    mouseClick(x, y) {
        this.autoplay = false;
        this.jump();
    }
}

// This class features a number of bouncing balls, with lines connecting each pair of balls that are close together
class BouncingConnectedBalls extends Widget {
    constructor(millisecondsPerTick, context, ballDensity, ballColour, lineColour) {
        super("Connected Balls", millisecondsPerTick, context);
        this.ballDensity = ballDensity || 0.01;
        this.ballRadius = 0;
        this.ballColour = ballColour;
        this.lineColour = lineColour;
        this.balls = [];
    }

    reset() {
        this.ballRadius = Math.min(this.context.canvas.width, this.context.canvas.height) / 100;
        this.connectionDistance = Math.min(this.context.canvas.width, this.context.canvas.height) / 5;
        let ballArea = Math.PI * this.ballRadius ** 2;
        let ballCount = ((this.context.canvas.width * this.context.canvas.height) / ballArea) * this.ballDensity;
        let maxSpeed = (Math.min(this.context.canvas.width, this.context.canvas.height) / 100) * motionScale;
        this.balls = Array.from({ length: ballCount }, () => {
            return {
                x: Math.random() * this.context.canvas.width,
                y: Math.random() * this.context.canvas.height,
                xSpeed: (Math.random() - 0.5) * maxSpeed,
                ySpeed: (Math.random() - 0.5) * maxSpeed,
            };
        });
    }

    draw() {
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        // Draw the connections first
        this.context.strokeStyle = this.lineColour || highlightColor;
        this.context.lineWidth = this.ballRadius / 4;
        this.context.beginPath();
        for (let i = 0; i < this.balls.length; i++) {
            let ball = this.balls[i];
            // Start after i, so each pair is only connected once
            for (let j = i + 1; j < this.balls.length; j++) {
                let otherBall = this.balls[j];
                let distanseSquared = (ball.x - otherBall.x) ** 2 + (ball.y - otherBall.y) ** 2;
                if (distanseSquared < this.connectionDistance ** 2) {
                    this.context.moveTo(ball.x, ball.y);
                    this.context.lineTo(otherBall.x, otherBall.y);
                }
            }
        }
        this.context.stroke();
        // Draw the balls over the connections
        this.context.fillStyle = this.ballColour || highlightColor;
        for (let ball of this.balls) {
            this.context.beginPath();
            this.context.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
            this.context.fill();
        }
    }

    tick() {
        for (let ball of this.balls) {
            ball.x += ball.xSpeed;
            ball.y += ball.ySpeed;
            if (ball.x < 0 || ball.x > this.context.canvas.width) {
                ball.xSpeed *= -1;
            }
            if (ball.y < 0 || ball.y > this.context.canvas.height) {
                ball.ySpeed *= -1;
            }
        }
    }

    mouseMoved(x, y, mouseDown) {
        this.balls[0].x = x;
        this.balls[0].y = y;
        this.balls[0].xSpeed = 0;
        this.balls[0].ySpeed = 0;
    }
}

// Carves a maze with a depth-first search, then floods it from the top left corner to find the way to the bottom right
class Maze extends Widget {
    constructor(millisecondsPerTick, context, roomsPerVmin, secondsToCarve) {
        super("Maze", millisecondsPerTick, context);
        this.roomsPerVmin = roomsPerVmin || 12;
        this.secondsToCarve = secondsToCarve || 6;
    }

    reset() {
        let width = this.context.canvas.width;
        let height = this.context.canvas.height;
        // Each room and each wall is one unit square, with a wall on every side
        this.unit = Math.min(width, height) / (this.roomsPerVmin * 2 + 1);
        this.columns = Math.floor((width / this.unit - 1) / 2);
        this.rows = Math.floor((height / this.unit - 1) / 2);
        this.offsetX = (width - (this.columns * 2 + 1) * this.unit) / 2;
        this.offsetY = (height - (this.rows * 2 + 1) * this.unit) / 2;

        let rooms = this.columns * this.rows;
        this.carved = new Uint8Array(rooms);
        this.openRight = new Uint8Array(rooms);
        this.openDown = new Uint8Array(rooms);
        // Carving visits each room twice, going in and backing out. It's sized for 60 ticks a second, so it takes longer when reduced motion slows the ticks
        this.stepsPerTick = Math.max(1, Math.ceil((2 * rooms) / (60 * this.secondsToCarve)));

        this.phase = "carving";
        this.carved[0] = 1;
        this.stack = [0];
        this.route = [];
    }

    neighbours(room) {
        let x = room % this.columns;
        let y = Math.floor(room / this.columns);
        let neighbours = [];
        if (x > 0) neighbours.push(room - 1);
        if (x < this.columns - 1) neighbours.push(room + 1);
        if (y > 0) neighbours.push(room - this.columns);
        if (y < this.rows - 1) neighbours.push(room + this.columns);
        return neighbours;
    }

    // The wall between two neighbouring rooms is stored on the room to its left or above it
    wallBetween(a, b) {
        let first = Math.min(a, b);
        return Math.abs(a - b) === 1 ? { open: this.openRight, room: first } : { open: this.openDown, room: first };
    }

    startSolving(goal) {
        this.goal = goal;
        this.distance = new Int32Array(this.columns * this.rows).fill(-1);
        this.previous = new Int32Array(this.columns * this.rows).fill(-1);
        this.distance[0] = 0;
        this.queue = [0];
        this.route = [];
        this.phase = "solving";
    }

    tick() {
        for (let step = 0; step < this.stepsPerTick; step++) {
            if (this.phase === "carving") {
                this.carveStep();
            } else if (this.phase === "solving") {
                this.solveStep();
            }
        }
        if (this.phase === "solved" && --this.holdTicks <= 0) {
            this.reset();
        }
    }

    carveStep() {
        let current = this.stack[this.stack.length - 1];
        let options = this.neighbours(current).filter((room) => !this.carved[room]);
        if (options.length === 0) {
            this.stack.pop();
            if (this.stack.length === 0) {
                this.startSolving(this.carved.length - 1);
            }
            return;
        }
        let next = options[Math.floor(Math.random() * options.length)];
        let wall = this.wallBetween(current, next);
        wall.open[wall.room] = 1;
        this.carved[next] = 1;
        this.stack.push(next);
    }

    solveStep() {
        let room = this.queue.shift();
        if (room === this.goal) {
            for (let r = room; r !== -1; r = this.previous[r]) {
                this.route.push(r);
            }
            this.phase = "solved";
            this.holdTicks = (1000 / this.millisecondsPerTick) * 4;
            return;
        }
        for (let next of this.neighbours(room)) {
            let wall = this.wallBetween(room, next);
            if (wall.open[wall.room] && this.distance[next] === -1) {
                this.distance[next] = this.distance[room] + 1;
                this.previous[next] = room;
                this.queue.push(next);
            }
        }
    }

    roomCorner(room) {
        return {
            x: this.offsetX + ((room % this.columns) * 2 + 1) * this.unit,
            y: this.offsetY + (Math.floor(room / this.columns) * 2 + 1) * this.unit,
        };
    }

    draw() {
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        // Rooms and the passages carved between them
        this.context.fillStyle = highlightColor;
        for (let room = 0; room < this.carved.length; room++) {
            if (!this.carved[room]) continue;
            let corner = this.roomCorner(room);
            this.context.fillRect(corner.x, corner.y, this.unit, this.unit);
            if (this.openRight[room]) this.context.fillRect(corner.x + this.unit, corner.y, this.unit, this.unit);
            if (this.openDown[room]) this.context.fillRect(corner.x, corner.y + this.unit, this.unit, this.unit);
        }

        this.context.fillStyle = accentColor;
        if (this.phase === "carving" && this.stack.length > 0) {
            // The end of the tunnel being dug
            let corner = this.roomCorner(this.stack[this.stack.length - 1]);
            this.context.fillRect(corner.x, corner.y, this.unit, this.unit);
        } else {
            // A small dot in each room the flood has reached
            for (let room = 0; room < this.distance.length; room++) {
                if (this.distance[room] === -1) continue;
                let corner = this.roomCorner(room);
                this.context.beginPath();
                this.context.arc(corner.x + this.unit / 2, corner.y + this.unit / 2, this.unit / 8, 0, Math.PI * 2);
                this.context.fill();
            }
            // The goal is a hollow square until the route reaches it
            let goal = this.roomCorner(this.goal);
            this.context.strokeStyle = accentColor;
            this.context.lineWidth = this.unit / 6;
            this.context.strokeRect(goal.x + this.unit / 6, goal.y + this.unit / 6, (this.unit * 2) / 3, (this.unit * 2) / 3);
        }

        if (this.route.length > 0) {
            this.context.strokeStyle = accentColor;
            this.context.lineWidth = this.unit / 3;
            this.context.lineCap = "round";
            this.context.lineJoin = "round";
            this.context.beginPath();
            for (let room of this.route) {
                let corner = this.roomCorner(room);
                this.context.lineTo(corner.x + this.unit / 2, corner.y + this.unit / 2);
            }
            this.context.stroke();
        }
    }

    mouseClick(x, y) {
        // Once it's carved, clicking a room finds the way there instead
        if (this.phase === "carving") return;
        let column = Math.floor((x - this.offsetX) / this.unit / 2);
        let row = Math.floor((y - this.offsetY) / this.unit / 2);
        if (column >= 0 && column < this.columns && row >= 0 && row < this.rows) {
            this.startSolving(row * this.columns + column);
        }
    }
}

// An ant that turns right on an empty cell and left on a filled one, flipping the cell as it leaves. After about 10,000 steps of chaos it builds a "highway"
class LangtonsAnt extends Widget {
    static directions = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
    ];

    constructor(millisecondsPerTick, context, cellsPerVmin, stepsPerTick, maxAnts) {
        super("Langton's Ant", millisecondsPerTick, context);
        this.cellsPerVmin = cellsPerVmin || 60;
        this.stepsPerTick = stepsPerTick || 20;
        this.maxAnts = maxAnts || 8;
    }

    reset() {
        this.cellSize = Math.min(this.context.canvas.width, this.context.canvas.height) / this.cellsPerVmin;
        this.gridWidth = Math.floor(this.context.canvas.width / this.cellSize);
        this.gridHeight = Math.floor(this.context.canvas.height / this.cellSize);
        this.offsetX = (this.context.canvas.width - this.gridWidth * this.cellSize) / 2;
        this.offsetY = (this.context.canvas.height - this.gridHeight * this.cellSize) / 2;
        this.cells = new Uint8Array(this.gridWidth * this.gridHeight);
        this.ants = [{ x: Math.floor(this.gridWidth / 2), y: Math.floor(this.gridHeight / 2), direction: 0 }];
    }

    tick() {
        for (let step = 0; step < this.stepsPerTick; step++) {
            for (let ant of this.ants) {
                let cell = ant.y * this.gridWidth + ant.x;
                ant.direction = (ant.direction + (this.cells[cell] ? 3 : 1)) % 4;
                this.cells[cell] ^= 1;
                // Wrap around the edges
                ant.x = (ant.x + LangtonsAnt.directions[ant.direction].x + this.gridWidth) % this.gridWidth;
                ant.y = (ant.y + LangtonsAnt.directions[ant.direction].y + this.gridHeight) % this.gridHeight;
            }
        }
    }

    draw() {
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        this.context.fillStyle = highlightColor;
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.cells[y * this.gridWidth + x]) {
                    this.context.fillRect(this.offsetX + x * this.cellSize, this.offsetY + y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    mouseClick(x, y) {
        // Drop another ant where clicked, replacing the oldest once there are plenty
        let cellX = Math.floor((x - this.offsetX) / this.cellSize);
        let cellY = Math.floor((y - this.offsetY) / this.cellSize);
        if (cellX >= 0 && cellX < this.gridWidth && cellY >= 0 && cellY < this.gridHeight) {
            this.ants.push({ x: cellX, y: cellY, direction: Math.floor(Math.random() * 4) });
            if (this.ants.length > this.maxAnts) {
                this.ants.shift();
            }
        }
    }
}

// Traces the path of a pen moved by two damped pendulums on each axis, swinging at nearly whole-number ratios of each other
class Harmonograph extends Widget {
    constructor(millisecondsPerTick, context, pointsPerTick) {
        super("Harmonograph", millisecondsPerTick, context);
        this.pointsPerTick = pointsPerTick || 6;
        this.timeStep = 0.03;
    }

    reset() {
        let frequencies = [1, 2, 3, 4];
        let pendulum = () => ({
            // Slightly off a whole number, so the figure slowly rotates as it decays
            frequency: frequencies[Math.floor(Math.random() * frequencies.length)] + (Math.random() - 0.5) * 0.04,
            phase: Math.random() * Math.PI * 2,
            damping: 0.02 + Math.random() * 0.01,
        });
        this.pendulums = { x: [pendulum(), pendulum()], y: [pendulum(), pendulum()] };
        this.time = 0;
        this.points = [];
        this.holdTicks = (1000 / this.millisecondsPerTick) * 3;
    }

    // Where the pen is at a given time, from -1 to 1 on each axis
    penAt(time) {
        let swing = (pendulums) => pendulums.reduce((sum, p) => sum + 0.5 * Math.sin(p.frequency * time + p.phase) * Math.exp(-p.damping * time), 0);
        return { x: swing(this.pendulums.x), y: swing(this.pendulums.y) };
    }

    tick() {
        if (this.finished()) {
            // Leave the finished figure up for a moment before drawing a new one
            if (--this.holdTicks <= 0) {
                this.reset();
            }
            return;
        }
        for (let point = 0; point < this.pointsPerTick; point++) {
            this.points.push(this.penAt(this.time));
            this.time += this.timeStep;
        }
    }

    finished() {
        // Every pendulum's damping is at least 0.02, so by then they've all lost 97% of their swing
        return this.time > Math.log(1 / 0.03) / 0.02;
    }

    draw() {
        let width = this.context.canvas.width;
        let height = this.context.canvas.height;
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, width, height);
        if (this.points.length === 0) return;

        let scaleY = height * 0.45;
        let scaleX = Math.min(width * 0.45, scaleY * 1.8);
        this.context.strokeStyle = highlightColor;
        this.context.lineWidth = Math.min(width, height) / 250;
        this.context.lineJoin = "round";
        this.context.beginPath();
        for (let point of this.points) {
            this.context.lineTo(width / 2 + point.x * scaleX, height / 2 + point.y * scaleY);
        }
        this.context.stroke();

        // The pen itself
        let pen = this.points[this.points.length - 1];
        this.context.fillStyle = accentColor;
        this.context.beginPath();
        this.context.arc(width / 2 + pen.x * scaleX, height / 2 + pen.y * scaleY, this.context.lineWidth * 2, 0, Math.PI * 2);
        this.context.fill();
    }

    mouseClick(x, y) {
        // Start a new figure
        this.reset();
    }
}

function updateColours() {
    // Set our colours to match the global CSS variables
    let rootStyle = getComputedStyle(document.documentElement);
    backgroundColor = rootStyle.getPropertyValue("--background-color").trim();
    highlightColor = rootStyle.getPropertyValue("--alt-background-color").trim();
    accentColor = rootStyle.getPropertyValue("--text-mute-color").trim();
}

attachListener(document, "DOMContentLoaded", function () {
    // Keep track of the user's preferred colour theme, which can change while the page is open
    updateColours();
    let colourObserver = new MutationObserver(updateColours);
    colourObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });

    const canvas = document.getElementById("simulation");
    const context = canvas.getContext("2d");

    let widgets = [
        new ConwaysGameOfLife(1000 / (reducedMotion ? 1 : 5), context), //
        new Boids(1000 / 60, context),
        new BouncingConnectedBalls(1000 / 60, context),
        new Maze(1000 / (60 * motionScale), context),
        new LangtonsAnt(1000 / (60 * motionScale), context),
        new Harmonograph(1000 / (60 * motionScale), context),
    ];
    if (!reducedMotion) {
        widgets.push(new FlappyBird(1000 / 60, context));
    }
    // shuffle widgets
    widgets = widgets
        .map((widget) => ({ widget, weight: Math.random() })) // map each widget to a random weight
        .sort((a, b) => a.weight - b.weight) // sort by weight
        .map(({ widget }) => widget); // map back to just the widget
    const widgetPlayDuration = 20000;

    let currentWidgetPlayTime = 0.0;
    let currentWidgetIndex = 0;
    // Choosing a widget with its dot stops the slideshow on it
    let autoAdvance = true;

    // One dot per widget, filled in for the current one
    const dots = document.getElementById("widget_dots");
    const dotButtons = widgets.map((widget, index) => {
        let button = document.createElement("button");
        button.className = "widget_dot";
        button.title = widget.name;
        button.setAttribute("aria-label", widget.name);
        attachListener(button, "click", function () {
            autoAdvance = false;
            showWidget(index);
        });
        dots.appendChild(button);
        return button;
    });

    function showWidget(index) {
        currentWidgetIndex = index;
        currentWidgetPlayTime = 0;
        widgets[currentWidgetIndex].reset();
        dotButtons.forEach((button, i) => button.setAttribute("aria-current", i === currentWidgetIndex));
    }

    let now = Date.now();
    let running = false;
    function draw() {
        if (!running) {
            return;
        }
        let deltaTime = Date.now() - now;
        now = Date.now();
        if (autoAdvance) {
            currentWidgetPlayTime += deltaTime;
            if (currentWidgetPlayTime > widgetPlayDuration) {
                showWidget((currentWidgetIndex + 1) % widgets.length);
            }
        }

        widgets[currentWidgetIndex].nextFrame(deltaTime);
        widgets[currentWidgetIndex].draw();
        requestAnimationFrame(draw);
    }

    function setRunning(shouldRun) {
        if (shouldRun && !running) {
            // Don't count the time spent paused
            now = Date.now();
            running = true;
            requestAnimationFrame(draw);
        }
        running = shouldRun;
    }

    // The canvas is drawn in device pixels, so it stays sharp on high-DPI screens
    function resizeCanvas() {
        canvas.width = Math.round(canvas.offsetWidth * window.devicePixelRatio);
        canvas.height = Math.round(canvas.offsetHeight * window.devicePixelRatio);
    }

    // Convert a mouse event to canvas pixels, or null if it's outside the canvas or on the dots
    function canvasPosition(event) {
        if (dots.contains(event.target)) {
            return null;
        }
        let rect = canvas.getBoundingClientRect();
        let eventOutOfBounds = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (eventOutOfBounds) {
            return null;
        }
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height),
        };
    }

    attachListener(window, "mousemove", function (event) {
        let position = canvasPosition(event);
        if (position) {
            widgets[currentWidgetIndex].mouseMoved(position.x, position.y, event.buttons === 1);
        }
    });

    attachListener(window, "click", function (event) {
        let position = canvasPosition(event);
        if (position) {
            widgets[currentWidgetIndex].mouseClick(position.x, position.y);
        }
    });

    attachListener(window, "load", function () {
        resizeCanvas();
        showWidget(0);
        // Only animate while the banner is on screen, to save CPU and battery
        if ("IntersectionObserver" in window) {
            new IntersectionObserver((entries) => setRunning(entries[entries.length - 1].isIntersecting)).observe(canvas);
        } else {
            setRunning(true);
        }
    });

    attachListener(window, "resize", function () {
        resizeCanvas();
        widgets[currentWidgetIndex].reset();
    });
});
