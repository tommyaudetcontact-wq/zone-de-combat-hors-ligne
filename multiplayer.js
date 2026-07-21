// ========================================================
// MULTIPLAYER.JS : GESTION DES REMATCHS EN LIGNE
// ========================================================

const MultiplayerManager = {
    peer: null,
    connection: null,
    roomCode: "",
    isHost: false,
    hostDeckReady: false,
    guestDeckReady: false,

    init() {},

    creerDuel() {
        this.isHost = true;
        this.hostDeckReady = false;
        this.guestDeckReady = false;
        localMatch.myRole = "host";

        this.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        let codeDisplay = document.getElementById('displayRoomCode');
        if (codeDisplay) codeDisplay.innerText = this.roomCode;
        
        const modal = new bootstrap.Modal(document.getElementById('multiWaitingModal'));
        modal.show();

        this.peer = new Peer('brawltasks-' + this.roomCode);

        this.peer.on('open', (id) => {
            console.log("Salon P2P créé avec ID: " + id);
        });

        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.configurerConnexion();
            modal.hide();
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
            const pHost = LISTE_POUVOIRS[Math.floor(Math.random() * LISTE_POUVOIRS.length)];
            const pGuest = LISTE_POUVOIRS[Math.floor(Math.random() * LISTE_POUVOIRS.length)];

            this.envoyerAction({
                type: 'START_SLOT_MACHINE',
                pouvoirHost: pHost,
                pouvoirGuest: pGuest
            });

            PouvoirManager.lancerSlotMachineSynchro(pHost, pGuest, () => {
                demarrerInterfaceCombat();
            });
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
        else if (data.type === 'START_SLOT_MACHINE') {
            if (rewardModalInst) rewardModalInst.hide();
            PouvoirManager.lancerSlotMachineSynchro(data.pouvoirGuest, data.pouvoirHost, () => {
                demarrerInterfaceCombat();
            });
        }
        else if (data.type === 'DEMANDE_REMATCH') {
            rematchModalInst.show();
        }
        else if (data.type === 'REMATCH_ACCEPTE') {
            if (rewardModalInst) rewardModalInst.hide();
            validerMonDeck();
        }
        else if (data.type === 'COUP_JOUE') {
            jouerCoupLocal(data.actionType, data.dmg, data.element, true);
        }
        else if (data.type === 'POUVOIR_ACTIVATION') {
            localMatch.pouvoirJ2Utilise = true;
            
            if (data.pid === 'a_lagonie') {
                localMatch.aLagonieCardIndexJ2 = localMatch.indexJ2;
            } else if (data.pid === 'outre_tombe') {
                localMatch.outreTombeJ2Declenche = true;
                localMatch.maxHpDeckJ2 = localMatch.maxHpDeckJ2.map(hp => Math.round(hp * 0.75));
                localMatch.currentHpDeckJ2 = localMatch.currentHpDeckJ2.map((hp, i) => hp <= 0 ? localMatch.maxHpDeckJ2[i] : Math.round(hp * 0.75));
                localMatch.hpJ2 = localMatch.currentHpDeckJ2[localMatch.indexJ2];
            } else if (data.pid === 'soins') {
                let limit = localMatch.maxHpDeckJ2[localMatch.indexJ2];
                localMatch.hpJ2 = Math.min(limit, localMatch.hpJ2 + Math.round(limit * 0.5));
            } else if (data.pid === 'dernier_souffle') {
                localMatch.toursDernierSouffleJ2 = 2;
                localMatch.maxHpDeckJ2[localMatch.indexJ2] = Math.round(localMatch.maxHpDeckJ2[localMatch.indexJ2] * 1.25);
                localMatch.hpJ2 = Math.round(localMatch.hpJ2 * 1.25);
            } else if (data.pid === 'vif_dor' || data.pid === 'esquive_block') {
                localMatch.esquivePreequipeeJ2 = true;
            }

            let logBox = document.getElementById('combatLog');
            if (logBox) logBox.innerText = `⚡ ${localMatch.enemyName} active son pouvoir : ${data.nomPouvoir} !`;
            synchroniserVisuelsLocaux(false);
        }
    }
};

function repondreRematch(accepte) {
    let modal = bootstrap.Modal.getInstance(document.getElementById('rematchRequestModal'));
    modal.hide();
    if (accepte) {
        MultiplayerManager.envoyerAction({ type: 'REMATCH_ACCEPTE' });
        if (rewardModalInst) rewardModalInst.hide();
        validerMonDeck();
    }
}