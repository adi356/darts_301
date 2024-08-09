var players = {}
var currentPlayer = null
var currentHits = []

// Load the dartboard
let request = new XMLHttpRequest()
request.addEventListener('load', result => {
    document.getElementById('dartboard-container').innerHTML = result.target.response

    for (let i = 1; i <= 20; i++) {
        document.getElementById('s' + i).onclick = () => addHit('s' + i)
        document.getElementById('d' + i).onclick = () => addHit('d' + i)
        document.getElementById('t' + i).onclick = () => addHit('t' + i)
    }

    document.getElementById('Outer').onclick = () => addHit('bo')
    document.getElementById('Bull').onclick = () => addHit('bi')

    if (window.innerHeight != document.querySelector('.screen.active').offsetHeight) {
        resize()

        window.addEventListener('orientationchange', resize)
        window.addEventListener('resize', resize)
    }
})
request.open('GET', '/dartboard/dartboard.svg')
request.send()

function addHit(field) {
    if (currentHits.length < 3) {
        console.log(currentPlayer + ' hit ' + fieldName(field))

        currentHits.push(field)
    }

    updateCurrent()
}

function updateCurrent() {
    // Print current hits
    document.getElementById('board-current-hits').innerHTML = currentHits.map(field => fieldName(field)).join(', ')

    let roundScore = currentHits.reduce((total, field) => total + fieldValue(field), 0)
    let currentScore = players[currentPlayer].score + roundScore

    document.getElementById('board-player-score').innerHTML = currentScore + ' (' + (301 - currentScore) + ')'

    // Enable or disable the confirm button
    document.getElementById('board-confirm-button').disabled = currentHits.length < 3 && currentScore < 301
}

function fieldName(field) {
    switch (field) {
        case 'bi': return 'Bullseye'
        case 'bo': return 'Outer Bull'
        case 'miss': return 'Miss'
    }

    switch (field[0]) {
        case 's': return 'Single ' + field.substr(1)
        case 'd': return 'Double ' + field.substr(1)
        case 't': return 'Triple ' + field.substr(1)
    }
}

function fieldValue(field) {
    switch (field) {
        case 'bi': return 50
        case 'bo': return 25
        case 'miss': return 0
    }

    switch (field[0]) {
        case 's': return field.substr(1) * 1
        case 'd': return field.substr(1) * 2
        case 't': return field.substr(1) * 3
    }
}

document.getElementById('add-player-form').onsubmit = e => {
    let name = e.target.name.value.trim()

    // Check if name is empty
    if (!name) {
        return false
    }

    // Reset input for name
    document.getElementById('add-player-form').name.value = ''

    players[name] = {
        score: 0,
        rounds: []
    }

    document.getElementById('add-players-list').innerHTML = Object.keys(players).join(', ')

    document.getElementById('add-players-start-button').disabled = false

    return false
}

document.getElementById('add-players-start-button').onclick = e => {
    currentPlayer = Object.keys(players)[0]

    // Reset the add players screen
    document.getElementById('add-players-list').innerHTML = ''
    e.target.disabled = true

    openBoard()
}

function setScreen(screen) {
    document.querySelectorAll('.screen').forEach(element => {
        element.classList.remove('active')
    })

    document.querySelector('.screen-' + screen).classList.add('active')
}

function openBoard() {
    document.getElementById('dartboard-title').innerHTML = currentPlayer
    updateCurrent()

    setScreen('dartboard')
}

function openLeaderboard() {
    // Update the leaderboard
    document.getElementById('leaderboard-body').innerHTML = ''

    let roundCount = Object.keys(players).reduce((max, player) => Math.max(max, players[player].rounds.length), 0)

    let playerPositions = Object.keys(players).sort((a, b) => {
        let aScore = players[a].score
        let bScore = players[b].score

        let aRounds = players[a].rounds.length
        let bRounds = players[b].rounds.length

        if (aScore > bScore) {
            return -1
        } else if (aScore < bScore) {
            return 1
        } else if (aRounds < bRounds) {
            return -1
        } else if (aRounds > bRounds) {
            return 1
        }

        return 0
    })

    document.getElementById('leaderboard-header-row').innerHTML = '<th>Round #</th><th>' + Object.keys(players).map(player => (playerPositions.indexOf(player) + 1) + '. ' + player + '<br>' + players[player].score + ' (' + (301 - players[player].score) + ')').join('</th><th>') + '</th>'

    for (let i = 0; i < roundCount; i++) {
        let row = '<tr><td>' + (i + 1) + '</td>'

        Object.keys(players).forEach(player => {
            if (players[player].rounds[i]) {
                let round = players[player].rounds[i]

                row += '<td>' + round.map(field => fieldName(field)).join(', ') + ' (' + round.reduce((total, field) => total + fieldValue(field), 0) + ')</td>'
            } else {
                row += '<td></td>'
            }
        })

        document.getElementById('leaderboard-body').innerHTML += row + '</tr>'
    }

    // Enable or disable the button for returning to the dartboard
    document.getElementById('leaderboard-dartboard-button').disabled = !Object.keys(players).filter(player => players[player].score < 301).length

    setScreen('leaderboard')
}

document.getElementById('launch-continue-button').onclick = () => setScreen('add-players')

document.getElementById('board-confirm-button').onclick = () => {
    players[currentPlayer].rounds.push(currentHits)

    let roundScore = currentHits.reduce((total, field) => total + fieldValue(field), 0)
    let currentScore = players[currentPlayer].score += roundScore

    if (currentScore == 301) {
        // Winner
    } else if (currentScore > 301) {
        // Undo score change
        players[currentPlayer].score -= roundScore
    }

    currentHits = []
    currentPlayer = findNextPlayer()

    if (currentPlayer) {
        openBoard()
    } else {
        // Game has ended
        openLeaderboard()
    }

    // Save players
    localStorage.setItem('darts-players', JSON.stringify(players))
}
document.getElementById('board-miss-button').onclick = () => addHit('miss')
document.getElementById('board-wrong-button').onclick = () => {
    currentHits.pop()

    updateCurrent()
}

function findNextPlayer() {
    let playersLeft = Object.keys(players).filter(player => players[player].score < 301)

    return playersLeft.sort((a, b) => players[a].rounds.length - players[b].rounds.length)[0]

    if (playersLeft.length < 1) {
        return false
    }

    let currentPlayerIndex = playersLeft.indexOf(currentPlayer)
    if (currentPlayerIndex + 1 >= playersLeft.length) {
        return playersLeft[0]
    } else {
        return playersLeft[currentPlayerIndex + 1]
    }
}

document.getElementById('board-leaderboard-button').onclick = () => openLeaderboard()
document.getElementById('leaderboard-dartboard-button').onclick = () => openBoard()

document.getElementById('leaderboard-reset-button').onclick = () => {
    localStorage.removeItem('darts-players')
    players = {}
    setScreen('launch')
}

// Load data from local storage
if (localStorage.getItem('darts-players')) {
    players = JSON.parse(localStorage.getItem('darts-players'))
    currentPlayer = findNextPlayer()
    openLeaderboard()
}

function resize() {
    document.querySelectorAll('.screen').forEach(element => {
        element.style.height = window.innerHeight + 'px'
    })

    document.querySelector('.screen-dartboard #dartboard').style['max-height'] = (window.innerHeight - 395) + 'px'
    document.querySelector('.screen-leaderboard .leaderboard-table-wrapper').style.height = (window.innerHeight - 175) + 'px'
}
