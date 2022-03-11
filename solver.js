const tubeContainer = document.querySelector('tube-container')
const navigator = document.querySelector('navigator')
const removeBallButton = document.querySelector("#remove-ball")
removeBallButton.onclick = () => { solver.pop() }
const leftButton = document.querySelector('#step-left')
leftButton.onclick = () => { solver.move(-1) }
const rightButton = document.querySelector('#step-right')
rightButton.onclick = () => { solver.move(+1)  }
const shrinkTubeButton = document.querySelector("#shrink-tube")
shrinkTubeButton.onclick = () => { solver.setTubeSize(solver.tubeSize - 1) }
const growTubeButton = document.querySelector("#grow-tube")
growTubeButton.onclick = () => { solver.setTubeSize(solver.tubeSize + 1) }
const resetButton = document.querySelector('#reset')
resetButton.onclick = () => { solver.reset() }
const returnButton = document.querySelector('#return')
returnButton.onclick = () => { solver.setState('setup') }
const solveButton = document.querySelector('#solve')
solveButton.onclick = () => { solver.solve() }
const colorGroup = document.querySelector('#color-group')

const minTubeSize = 2
const maxTubeSize = 7

const colorCount = 12
for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
    let node = document.createElement('button')
    node.setAttribute('colorIndex', colorIndex)
    node.onclick = () => { solver.push(colorIndex) }
    colorGroup.appendChild(node)
}

const bindings = {
    'Backspace': removeBallButton,
    '-': shrinkTubeButton,
    '+': growTubeButton,
    'Enter': solveButton,
    'Escape': returnButton,
    'Delete': resetButton,
    'ArrowLeft': leftButton,
    'ArrowRight': rightButton,
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
        if(--this.usedColors[colorIndex] === 0)
            this.updateTubeCount()
        if(isCurrent)
            this.updateButtons()
        this.updateNavigatorPartial(colorIndex)
    }

    push(colorIndex) {
        if(this.state !== 'setup')
            return
        let index = this.currentTubeIndex
        if(this.tubes[index].length >= this.tubeSize || this.usedColors[colorIndex] >= this.tubeSize)
            return
        let ball = document.createElement('ball')
        ball.setAttribute('colorIndex', colorIndex)
        tubeContainer.childNodes[index].appendChild(ball)
        this.tubes[index].push(colorIndex)
        if(this.usedColors[colorIndex]++ === 0)
            this.updateTubeCount()
        if(this.tubes[index].length === this.tubeSize)
            this.updateSelection(this.currentTubeIndex + 1)
        this.updateNavigatorPartial(colorIndex)
        this.updateButtons()
    }

    updateTubeCount() {
        let expectedTubeCount = this.usedColors.filter(x => x > 0).length + 2
        console.log(`updateTubeCount ${expectedTubeCount}`)
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
        let isTubeFull = this.tubes[this.currentTubeIndex].length === this.tubeSize
        this.usedColors.forEach((count, i) => colorGroup.childNodes[i].disabled = isTubeFull || (count === this.tubeSize))
        removeBallButton.disabled = this.tubes[this.currentTubeIndex].length === 0
        resetButton.disabled = this.tubes.length === 2
        solveButton.disabled = resetButton.disabled || this.usedColors.some((count) => count % this.tubeSize !== 0)
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
        let disabled = this.usedColors[colorIndex] === 0
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
        console.log(step.tubes)
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
            tubeContainer.childNodes[step.from].className = 'sending'
        if(step.to !== undefined)
            tubeContainer.childNodes[step.to].className = 'receiving'
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
        return this.next_index >= this.queue.length
    }
    getNext() {
        return this.queue[this.next_index++]
    }
    push(state) {
        this.queue.push(state)
    }
}

function findSolution(input, tubeSize) {
    const SEPARATOR = ' '
    const EMPTY = ''
    const COMPLETED = '-'
    const almostTubeSize = tubeSize-1
    let initialScore = 0
    for(let tube of input)
        initialScore += tube.filter((x, i, a) => i > 0 && a[i-1] !== x).length
    let initialState = input.map(tube => tube.map(n => String.fromCharCode(65 + n)).reverse().join(''))
    initialState.forEach((tube, i) => {
        if(tube !== EMPTY && tube[0].repeat(tubeSize) === tube)
            initialState[i] = COMPLETED
    })
    initialState = initialState.join(SEPARATOR)

    let backtrack = { initialState: [''] }
    let states = Array.from({length: initialScore + 1}, _ => new StateQueue)
    states[initialScore].push(initialState)
    let currentScore = initialScore
    let resolvedState = undefined
    while(!resolvedState) {
        let hasImproved = false
        const state = states[currentScore].getNext()
        console.log(state)
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
                        hasImproved ||= isBetterScore
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
        if(hasImproved)
            currentScore--    
        while(states[currentScore].isEmpty()) {
            if(currentScore < initialScore)
                currentScore++
            else
                return []
        }
    }
    let steps = []
    while(resolvedState !== initialState) {
        let data = backtrack[resolvedState]
        resolvedState = data[0]
        steps.unshift({ from: data[1], to: data[2] })
    } 
    return steps
}

var solver = new Solver(4)