# ##################################################################### #
# movingShapes.py can be run to generate the css for an animation that  #
# doesn't require any javascript.                                       #
#                                                                       #
# Simply run this script, and paste the output into the HTML and CSS    #
# files for the page.                                                   #
# ##################################################################### #

import sys
import random
import numpy as np

def randomBetween(min: float, max: float) -> float:
    return random.random() * (max - min) + min

def randomNormal(mean: float, std: float) -> float:
    return np.random.normal(mean, std)

numShapes: int = 15
if len(sys.argv) > 1:
    numShapes = int(sys.argv[1])

print("""
# CSS BEGIN #

/* Credit for CSS idea to: "https://www.alvarotrigo.com/blog/animated-backgrounds-css/ */

.header_widget {
    width: 100%;
    --header_widget_height: 45vmin;
    height: var(--header_widget_height);
    border: none;
}

.moving_shapes {
    position: relative;
    overflow: hidden;
}

.moving_shapes div {
    position: absolute;
    top: 100%;
    display: block;
    --base-size: 10vw;
    animation: animate 25s linear infinite;
    background-color: var(--accent-color);
}""")

for i in range(1, numShapes + 1):
    left = randomBetween(0, 100)
    size = randomBetween(0.2, 1.8)
    animationDuration = max(3, randomNormal(20, 7.5))
    animationDelay = randomBetween(-animationDuration, animationDuration)

    print(f"""
.moving_shapes div:nth-child({i}) {{
    left: {left:.2f}%;
    transform: translateX(-50%);
    width: calc({size:.2f} * var(--base-size));
    height: calc({size:.2f} * var(--base-size));
    animation-delay: {animationDelay:.2f}s;
    animation-duration: {animationDuration:.2f}s;
}}""")

print("""
@keyframes animate {
    0% {
        transform: translateY(calc(0 * var(--header_widget_height))) rotate(0deg);
        opacity: 0.5;
        border-radius: 5%;
    }

    100% {
        transform: translateY(calc((-1 * var(--header_widget_height)) - 100%)) rotate(720deg);
        opacity: 0.1;
        border-radius: 50%;
    }
}

# CSS END #
# HTML BEGIN #

<--! Paste the following HTML into the desired location, add additional CSS classes below as desired -->
<div class="header_widget moving_shapes">""")

for i in range(1, numShapes + 1):
    print("    <div></div>")

print("""</div>

# HTML END #
      """)
