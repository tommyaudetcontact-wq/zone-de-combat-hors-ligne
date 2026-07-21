// ========================================================
// MULTIPLAYER.JS : MODE MULTIJOUEUR EN LIGNE (SANS POUVOIRS)
// ========================================================

const MultiplayerManager = {
    peer: null,
    connection: null,
    roomCode: "",
    isHost: false,
    hostDeckReady: false,
    guestDeckReady: false,

    creerDuel() {
        this.isHost = true;
        this.hostDeckReady = false;
        this.guestDeckReady = false;
        localMatch.myRole = "host";

        this.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        let codeDisplay = document.getElementById('displayRoomCode');
        if (codeDisplay) codeDisplay.innerText = this.roomCode;
        
        const modalEl = document.getElementById('multiWaitingModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }

        this.peer = new Peer('brawltasks-' + this.roomCode);

        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.configurerConnexion();
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
            lancerConfigurationDeck('multi');
        });
    },

    rejoindreDuel() {
        const inputCode = document.getElementById('joinCodeInput').value.trim();
        if (!inputCode || inputCode.length !== 4) {
            alert("⚠️ Entre un code à 4 chiffres valide !");
            return;
        }

        this.isHost = false;
        localMatch.myRole = "guest";
        this.roomCode = inputCode;

        this.peer = new Peer();

        this.peer.on('open', () => {
            this.connection = this.peer.connect('brawltasks-' + this.roomCode);
            this.configurerConnexion();
            
            this.connection.on('open', () => {
                lancerConfigurationDeck('multi');
            });
        });

        this.peer.on('error', () => {
            alert("❌ Code introuvable. Vérifie le code avec ton ami !");
        });
    },

    configurerConnexion() {
        this.connection.on('data', (data) => {
            this.recevoirAction(data);
        });
    },

    envoyerAction(donnees) {
        if (this.connection && this.connection.open) {
            this.connection.send(donnees);
        }
    },

    verifierLancementMatchSiPret() {
        if (this.isHost && this.hostDeckReady && this.guestDeckReady) {
            this.envoyerAction({ type: 'START_MATCH' });
            demarrerInterfaceCombat();
        }
    },

    recevoirAction(data) {
        if (data.type === 'DESK_READY') {
            localMatch.enemyName = data.senderName;
            localMatch.deckJ2 = data.deck;
            localMatch.maxHpDeckJ2 = data.maxHp.map(val => parseInt(val) || 25);
            localMatch.currentHpDeckJ2 = [...localMatch.maxHpDeckJ2];
            localMatch.hpJ2 = localMatch.currentHpDeckJ2[0];
            localMatch.botAtqBonusDeck = data.atqBonus;
            localMatch.botLvlsDeck = data.lvls;

            if (data.cardImgs && data.deck) {
                data.deck.forEach((id, index) => {
                    opponentCardImgsMap[id.toString()] = data.cardImgs[index];
                });
            }

            this.guestDeckReady = true;
            this.verifierLancementMatchSiPret();
        } 
        else if (data.type === 'START_MATCH') {
            if (rewardModalInst) rewardModalInst.hide();
            demarrerInterfaceCombat();
        }
        else if (data.type === 'DEMANDE_REMATCH') {
            if (rematchModalInst) rematchModalInst.show();
        }
        else if (data.type === 'REMATCH_ACCEPTE') {
            if (rewardModalInst) rewardModalInst.hide();
            validerMonDeck();
        }
        else if (data.type === 'COUP_JOUE') {
            jouerCoupLocal(data.actionType, data.dmg, data.element, true, data.reussiteEsquive);
        }
    }
};

function repondreRematch(accepte) {
    let modalEl = document.getElementById('rematchRequestModal');
    if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }
    
    if (accepte) {
        MultiplayerManager.envoyerAction({ type: 'REMATCH_ACCEPTE' });
        if (rewardModalInst) rewardModalInst.hide();
        validerMonDeck();
    }
}
