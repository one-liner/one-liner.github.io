const minTubeSize = 2
const maxTubeSize = 7
const defaultTubeSize = 4
const colorCount = 13
const colorUnknown = 0

const tubeContainer = document.querySelector('tube-container')
const navigator = document.querySelector('navigator')
const removeBallButton = document.querySelector("#remove-ball")
const leftButton = document.querySelector('#step-left')
const rightButton = document.querySelector('#step-right')
const shrinkTubeButton = document.querySelector("#shrink-tube")
const growTubeButton = document.querySelector("#grow-tube")
const resetButton = document.querySelector('#reset')
const returnButton = document.querySelector('#return')
const solveButton = document.querySelector('#solve')
const colorGroup = document.querySelector('#color-group')

for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
    let node = document.createElement('button')
    node.setAttribute('colorIndex', colorIndex)
    node.onclick = () => { solver.push(colorIndex) }
    colorGroup.appendChild(node)
}

class Solver {
    constructor(size) {
        this.usedColors = new Array(colorCount)
        this.reset()
        this.setTubeSize(size)
    }

    reset() {
        this.tubes = []
        while(tubeContainer.hasChildNodes())
            tubeContainer.lastChild.remove()
        this.usedColors.fill(0)
        this.updateTubeCount()
        this.setState('setup')
    }

    setState(state) {
        this.state = state
        document.body.className = state
        this.updateNavigator()
        if(state === 'solution')
            this.showState(0)
        else {
            this.showState()
            this.updateSelection(0)
        }
    }

    setTubeSize(size) {
        if(this.state !== 'setup')
            return
        size = Math.max(minTubeSize, Math.min(size, maxTubeSize))
        if(this.tubeSize > size)
            this.tubes.forEach((tube, index) => {
                while(tube.length > size)
                    this.pop(index)
            })
        shrinkTubeButton.disabled = size <= minTubeSize
        growTubeButton.disabled = size >= maxTubeSize
        this.tubeSize = size
        tubeContainer.style = `--tube-size:${size}`
        this.updateNavigator()
        this.updateButtons()
    }

    pop(tubeIndex) {
        if(this.state !== 'setup')
            return
        let isCurrent = (tubeIndex === undefined)
        if(isCurrent)
            tubeIndex = this.currentTubeIndex
        if(this.tubes[tubeIndex].length === 0)
            return
        tubeContainer.childNodes[tubeIndex].lastChild.remove()
        let colorIndex = this.tubes[tubeIndex].pop()
        if(--this.usedColors[colorIndex] === 0 || colorIndex === colorUnknown)
            this.updateTubeCount()
        if(isCurrent)
            this.updateButtons()
        this.updateNavigatorPartial(colorIndex)
    }

    push(colorIndex) {
        if(this.state !== 'setup')
            return
        let index = this.currentTubeIndex
        if(this.tubes[index].length >= this.tubeSize || (colorIndex !== colorUnknown && this.usedColors[colorIndex] >= this.tubeSize))
            return
        let ball = document.createElement('ball')
        ball.setAttribute('colorIndex', colorIndex)
        tubeContainer.childNodes[index].appendChild(ball)
        this.tubes[index].push(colorIndex)
        if(this.usedColors[colorIndex]++ === 0 || colorIndex === colorUnknown)
            this.updateTubeCount()
        if(this.tubes[index].length === this.tubeSize)
            this.updateSelection(this.currentTubeIndex + 1)
        this.updateNavigatorPartial(colorIndex)
        this.updateButtons()
    }

    updateTubeCount() {
        let expectedTubeCount = this.usedColors.filter((x,i) => i !== colorUnknown && x > 0).length + 2
        let unknownBallCount = this.usedColors[colorUnknown]
        this.usedColors.forEach((x,i) => { if(i !== colorUnknown && (x % this.tubeSize) !== 0) unknownBallCount -= this.tubeSize-x })
        if(unknownBallCount > 0)
            expectedTubeCount += Math.ceil(unknownBallCount / 4)
        while(this.tubes.length < expectedTubeCount) {
            this.tubes.push([])
            const tubeNode = document.createElement('tube')
            tubeNode.onclick = () =>
                solver.updateSelection([...tubeNode.parentNode.childNodes].indexOf(tubeNode))
            tubeContainer.appendChild(tubeNode)
        }
        let removeIndex = this.tubes.length
        let futureTubeIndex = this.currentTubeIndex
        while(this.tubes.length > expectedTubeCount) {
            do {
                removeIndex--
            } while(this.tubes[removeIndex].length > 0)
            this.tubes.splice(removeIndex, 1)
            tubeContainer.childNodes[removeIndex].remove()
            if(removeIndex <= futureTubeIndex)
                futureTubeIndex--
        }
        if(this.currentTubeIndex !== futureTubeIndex)
            this.updateSelection(futureTubeIndex)
    }

    updateSelection(tubeIndex) {
        if(this.state !== 'setup')
            return
        tubeIndex = Math.max(0, Math.min(tubeIndex, this.tubes.length-1))
        this.currentTubeIndex = tubeIndex
        tubeContainer.childNodes.forEach(tubeNode => tubeNode.className = '')
        tubeContainer.childNodes[tubeIndex].className = 'current'
        this.updateButtons()
    }

    updateButtons() {
        let tubeSpace = this.tubeSize - this.tubes[this.currentTubeIndex].length
        this.usedColors.forEach((count, i) => colorGroup.childNodes[i].disabled = (tubeSpace === 0) || (i === colorUnknown ? tubeSpace === 1 : count === this.tubeSize))
        removeBallButton.disabled = this.tubes[this.currentTubeIndex].length === 0
        resetButton.disabled = this.tubes.length === 2
        let spareBalls = this.usedColors[colorUnknown]
        this.usedColors.forEach((x, i) => {
            if (i !== colorUnknown && x > 0) spareBalls -= this.tubeSize - x
        })
        solveButton.disabled = resetButton.disabled || spareBalls < 0 || spareBalls % this.tubeSize !== 0
        leftButton.disabled = this.currentTubeIndex <= 0
        rightButton.disabled = this.currentTubeIndex >= this.tubes.length-1
    }

    solve() {
        if(this.state !== 'setup')
            return
        solveButton.disabled = true
        let steps = findSolution(this.tubes, this.tubeSize)
        if(!steps.length) {
            solveButton.setAttribute('shake', true)
            setTimeout(() => solveButton.removeAttribute('shake'), 500)
            return
        }
        let current = this.tubes.map(tube => tube.slice())
        for(let i = 0; i < steps.length; i++) {
            steps[i].tubes = current.map(tube => tube.slice())
            let colorIndex = current[steps[i].from].pop()
            steps[i].tubes[steps[i].to].push(colorIndex)
            steps[i].colorIndex = colorIndex
            current[steps[i].to].push(colorIndex)
        }
        steps.push({ tubes: current })
        this.solutionSteps = steps
        this.setState('solution')
    }

    updateNavigator() {
        let targetCount = (this.state === 'solution') ? this.solutionSteps.length : colorCount * this.tubeSize
        while(navigator.childNodes.length > targetCount)
            navigator.removeChild(navigator.lastChild)
        while(navigator.childNodes.length < targetCount)
            navigator.appendChild(document.createElement('step'))
        if(this.state === 'setup') {
            navigator.childNodes.forEach((step, i) => {
                step.setAttribute('colorIndex', Math.floor(i / this.tubeSize))
            })
            for(let colorIndex = 0; colorIndex < colorCount; colorIndex++)
                this.updateNavigatorPartial(colorIndex)
        } else {
            navigator.childNodes.forEach((step, i) => {
                step.hidden = false
                step.onclick = () => { solver.showState(i) }
                step.setAttribute('colorIndex', this.solutionSteps[i].colorIndex)
            })
        }
    }

    updateNavigatorPartial(colorIndex) {
        let offset = colorIndex * this.tubeSize
        let disabled = colorIndex === colorUnknown || this.usedColors[colorIndex] === 0
        for(let i = 0; i < this.tubeSize; i++) {
            let step = navigator.childNodes[offset + i]
            step.className = (i >= this.usedColors[colorIndex]) ? 'complete' : ''
            step.hidden = disabled
        }
    }

    showState(stepIndex) {
        let step = { tubes: this.tubes }
        let defaultClass = ''
        if(this.state === 'solution') {
            stepIndex = Math.max(0, Math.min(stepIndex, this.solutionSteps.length-1))
            this.currentStepIndex = stepIndex
            navigator.childNodes.forEach((node, i) => node.className = (i < stepIndex) ? 'complete' : '')
            navigator.childNodes[stepIndex].className = 'current'
            leftButton.disabled = stepIndex <= 0
            rightButton.disabled = stepIndex >= this.solutionSteps.length-1
            step = this.solutionSteps[stepIndex]
            defaultClass = 'muted'
        }
        step.tubes.forEach((tube, i) => {
            const tubeNode = tubeContainer.childNodes[i]
            while(tubeNode.childNodes.length > tube.length)
                tubeNode.removeChild(tubeNode.lastChild)
            while(tubeNode.childNodes.length < tube.length)
                tubeNode.appendChild(document.createElement('ball'))
            tubeNode.childNodes.forEach((node, j) => node.setAttribute('colorIndex', tube[j]))
            tubeNode.className = defaultClass
        })
        if(step.from !== undefined)
            tubeContainer.childNodes[step.from].className = 'donor'
        if(step.to !== undefined)
            tubeContainer.childNodes[step.to].className = 'recipient'
    }

    move(delta) {
        if(this.state === 'setup')
            this.updateSelection(this.currentTubeIndex + delta)
        else
            this.showState(this.currentStepIndex + delta)
    }
}

class StateQueue {
    constructor() {
        this.queue = [ ]
        this.next_index = 0
    }
    isEmpty() {
        return this.queue.length === 0
    }
    isExhausted() {
        return this.next_index >= this.queue.length
    }
    getNext() {
        return this.queue[this.next_index++]
    }
    push(state) {
        this.queue.push(state)
    }
    getBest() {
        return this.queue.slice(-1)[0]
    }
}

function findSolution(input, tubeSize) {
    const SEPARATOR = ' '
    const EMPTY = ''
    const COMPLETED = '-'
    const almostTubeSize = tubeSize-1
    let initialScore = 0 // Less is better, 0 means all adjacent balls are the same
    let stringState = []
    let unknownIndex = colorCount
    input.forEach(tube => {
        // All unknown balls are considered different from each other
        initialScore += tube.filter((x, i, a) => i > 0 && (x === colorUnknown || a[i-1] !== x)).length
        let stringTube = tube.map(n => String.fromCharCode(65 + (n == colorUnknown ? unknownIndex++ : n))).reverse().join('')
        stringState.push((stringTube !== EMPTY && stringTube[0].repeat(tubeSize) === stringTube) ? COMPLETED : stringTube)
    })
    const hasUnknown = unknownIndex > colorCount
    let initialState = stringState.join(SEPARATOR)
    // All discovered game states are organized into buckets of equal scores
    // Final (the best) state should eventually appear in the first bucket
    let states = Array.from({length: initialScore + 1}, _ => new StateQueue)
    states[initialScore].push(initialState) // Initial (the worst) state is being put in the last bucket
    let backtrack = { initialState: [''] } // All transitional data to restore the steps from initial to the final state
    let currentScore = initialScore // The current bucket
    let resolvedState = undefined // The coveted final state
    while(!resolvedState) {
        let scoreHasImproved = false
        const state = states[currentScore].getNext()
        const splitState = state.split(SEPARATOR)
        splitState.forEach((tubeFrom, iFrom) => {
            if(tubeFrom !== EMPTY && tubeFrom !== COMPLETED) {
                const topBall = tubeFrom[0]
                splitState.forEach((tubeTo, iTo) => {
                    if(iFrom !== iTo && tubeTo.length < tubeSize && (tubeTo.length === 0 || tubeTo[0] === topBall)) {
                        const newSplitState = state.split(SEPARATOR)
                        newSplitState[iFrom] = tubeFrom.substring(1)
                        newSplitState[iTo] = (tubeTo.length === almostTubeSize && tubeTo === topBall.repeat(almostTubeSize)) ? COMPLETED : topBall + tubeTo
                        const isBetterScore = newSplitState[iFrom].length > 0 && newSplitState[iFrom][0] !== topBall
                        scoreHasImproved ||= isBetterScore
                        const newState = newSplitState.join(SEPARATOR)
                        if(backtrack[newState] === undefined) {
                            backtrack[newState] = [state, iFrom, iTo]
                            const newScore = currentScore - isBetterScore
                            states[newScore].push(newState)
                            if(newScore === 0 && newSplitState.every(tube => tube === EMPTY || tube === COMPLETED))
                                resolvedState = newState
                        }
                    }
                })
            }
        })
        // If a better state was just found, continue search from there
        if(scoreHasImproved)
            currentScore--
        // If it was the last state in this bucket
        while(states[currentScore].isExhausted()) {
            if(currentScore < initialScore) // Consider a slightly worse one
                currentScore++
            else if(hasUnknown) { // Games with unknown balls have no solution
                // So the last state with the best score will do
                resolvedState = states.find(x => !x.isEmpty()).getBest()
                break
            } else // Alas, the search was exhausted with no solution
                return []
        }
    }
    // Backtracking from the final state to the initial
    let steps = []
    while(resolvedState !== initialState) {
        let data = backtrack[resolvedState]
        resolvedState = data[0]
        steps.unshift({ from: data[1], to: data[2] })
    } 
    return steps
}

// GUI bindings
const solver = new Solver(defaultTubeSize)
removeBallButton.onclick = () => { solver.pop() }
leftButton.onclick = () => { solver.move(-1) }
rightButton.onclick = () => { solver.move(+1) }
shrinkTubeButton.onclick = () => { solver.setTubeSize(solver.tubeSize - 1) }
growTubeButton.onclick = () => { solver.setTubeSize(solver.tubeSize + 1) }
resetButton.onclick = () => { solver.reset() }
returnButton.onclick = () => { solver.setState('setup') }
solveButton.onclick = () => { solver.solve() }

// Keyboard bindings
const bindings = {
    'Backspace': removeBallButton,
    '-': shrinkTubeButton,
    '+': growTubeButton,
    'Enter': solveButton,
    'Escape': returnButton,
    'Delete': resetButton,
    'ArrowLeft': leftButton,
    'ArrowRight': rightButton,
    'ArrowUp': removeBallButton,
    'r': colorGroup.childNodes[0],
    'o': colorGroup.childNodes[1],
    'y': colorGroup.childNodes[2],
    's': colorGroup.childNodes[3],
    'f': colorGroup.childNodes[4],
    'm': colorGroup.childNodes[5],
    'c': colorGroup.childNodes[6],
    'b': colorGroup.childNodes[7],
    'p': colorGroup.childNodes[8],
    'u': colorGroup.childNodes[9],
    'w': colorGroup.childNodes[10],
    'g': colorGroup.childNodes[11]        
}
document.addEventListener('keydown', (event) => {
    const button = bindings[event.key]
    if(button !== undefined)
        button.onclick.call()
})
