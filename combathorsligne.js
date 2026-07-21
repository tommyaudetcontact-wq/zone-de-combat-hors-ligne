// ========================================================
// COMBATHORSLIGNE.JS : MOTEUR DE COMBAT SÉCURISÉ & CORRIGÉ
// ========================================================

const API_URL = "https://script.google.com/macros/s/AKfycbzKgKRkfVyQuNCrc0T13iH1orPFeWIZAK4kB_emnRFimN-ae_HzISIqUzZ_g1aWgPwHjg/exec";
let currentUser = null, currentUserPref = "Tous", listeMembres = [];
let selectedTeamIds = [], myCollection = [];
let rewardModalInst = null, rematchModalInst = null, isCardsLoaded = false, cardsToUpgradeQueue = [];
let serveurSauvegardeTerminee = false;

let isMultiplayerMode = false;
let opponentCardImgsMap = {}; 

let localMatch = {
    myRole: "host", 
    tourA: "host",
    enemyName: "ADVERSAIRE"
};

window.addEventListener('DOMContentLoaded', () => {
    rewardModalInst = new bootstrap.Modal(document.getElementById('rewardModal'));
    rematchModalInst = new bootstrap.Modal(document.getElementById('rematchRequestModal'));
    const s1 = document.getElementById('usernameSelect');
    if (s1) s1.innerHTML = '<option value="">Connexion au serveur...</option>';
    
    fetch(`${API_URL}?action=getMembres`).then(res => res.json()).then(membres => {
        listeMembres = membres || [];
        if (s1) {
            s1.innerHTML = '<option value="">-- Qui es-tu ? --</option>';
            listeMembres.filter(m => m && m.Nom !== 'Admin').forEach(m => {
                s1.innerHTML += `<option value="${m.Nom}">${m.Nom}</option>`;
            });
        }

        const savedUser = localStorage.getItem('brawlUser');
        if (savedUser) {
            currentUser = savedUser;
            let mFound = listeMembres.find(m => m && m.Nom === currentUser);
            currentUserPref = mFound ? (mFound.Type_Recompense || mFound.Preference_Cartes || "les_deux") : "les_deux";

            let loginPage = document.getElementById('loginPage');
            if (loginPage) loginPage.classList.add('d-none'); 
            
            let headerBar = document.getElementById('headerBar');
            if (headerBar) headerBar.classList.remove('d-none');
            
            let lobbyPhase = document.getElementById('lobbyPhase');
            if (lobbyPhase) lobbyPhase.classList.remove('d-none');
            
            let displayUsername = document.getElementById('displayUsername');
            if (displayUsername) displayUsername.innerText = currentUser.toUpperCase();
            
            chargerCartesDuJoueur();
        }
    });
});

function handleLogin() {
    currentUser = document.getElementById('usernameSelect').value; if(!currentUser) return;
    localStorage.setItem('brawlUser', currentUser);

    let mFound = listeMembres.find(m => m && m.Nom === currentUser);
    currentUserPref = mFound ? (mFound.Type_Recompense || mFound.Preference_Cartes || "les_deux") : "les_deux";

    document.getElementById('loginPage').classList.add('d-none'); 
    document.getElementById('headerBar').classList.remove('d-none');
    document.getElementById('lobbyPhase').classList.remove('d-none');
    document.getElementById('displayUsername').innerText = currentUser.toUpperCase();
    chargerCartesDuJoueur();
}

function handleLogout() {
    localStorage.removeItem('brawlUser');
    localStorage.removeItem('brawlRole');
    window.location.href = "https://tommyaudetcontact-wq.github.io/brawlTasks2.0/";
}

function chargerCartesDuJoueur() {
    fetch(`${API_URL}?action=getCollection`).then(res => res.json()).then(cards => {
        myCollection = cards.filter(c => (c.Nom_Joueur || "").toLowerCase() === currentUser.toLowerCase());
        isCardsLoaded = true;
    });
}

function lancerConfigurationDeck(mode) {
    if (!isCardsLoaded) return;
    isMultiplayerMode = (mode === 'multi');
    document.getElementById('lobbyPhase').classList.add('d-none');
    document.getElementById('setupPhase').classList.remove('d-none');
    renderGrid();
}

function renderGrid() {
    const container = document.getElementById('selectionGrid'); 
    if(!container) return;
    container.innerHTML = "";
    
    myCollection.forEach((c) => {
        let img = getCardImgUrl(c.Pokemon_API_ID);
        let id = c.Pokemon_API_ID;
        let isSel = selectedTeamIds.includes(id) ? 'selected' : '';
        
        let nrg = (c.Energie !== undefined && c.Energie !== "") ? parseInt(c.Energie) : 100;
        let cln = (c.Proprete !== undefined && c.Proprete !== "") ? parseInt(c.Proprete) : 100;
        let condTxt = "Bon état"; let condStyle = "color:#10D010;";
        if(nrg < 30 || cln < 30) { condTxt = "Mauvais état ⚠️"; condStyle = "color:#FF007F;"; }
        else if(nrg < 60 || cln < 60) { condTxt = "État Moyen ⏳"; condStyle = "color:#FFF200;"; }

        let atqBonus = (c.Attaque_Bonus !== undefined && c.Attaque_Bonus !== "") ? parseInt(c.Attaque_Bonus) : 0;
        let minAtq = 10 + atqBonus;
        let maxAtq = 21 + atqBonus;
        if (nrg < 30 || cln < 30) {
            minAtq = Math.round(minAtq * 0.66);
            maxAtq = Math.round(maxAtq * 0.66);
        }
        let lvl = c.Carte_Niveau || 1;

        container.innerHTML += `
            <div class="col-6 col-sm-4 col-md-3 text-center d-flex flex-column align-items-center mb-3">
                <div class="pokemon-card-wrapper ${isSel}" onclick="toggleCard('${id}')">
                    <img src="${img}" class="pokemon-card-img">
                </div>
                <div class="brawl-font-sm text-warning mt-1" style="font-size: 0.9rem;">NIVEAU ${lvl}</div>
                <div class="fw-bold text-info" style="font-size: 0.8rem;">⚔️ ATQ: ${minAtq} - ${maxAtq}</div>
                <div class="fw-bold mt-1" style="${condStyle}; font-size: 0.75rem;">${condTxt.toUpperCase()}</div>
            </div>`;
    });
}

function toggleCard(id) {
    if(selectedTeamIds.includes(id)) selectedTeamIds = selectedTeamIds.filter(i => i !== id); 
    else if (selectedTeamIds.length < 3) selectedTeamIds.push(id);
    renderGrid();
    
    let btn = document.getElementById('startMatchBtn');
    if (btn) {
        btn.innerText = `LANCER LE COMBAT (${selectedTeamIds.length} / 3)`;
        btn.disabled = selectedTeamIds.length !== 3;
    }
}

function validerMonDeck() {
    if (!isMultiplayerMode) {
        localMatch.myRole = "host";
        localMatch.tourA = "host";
        genererStructureMatchBot();
        PouvoirManager.declencherTirageSlotMachine(() => {
            demarrerInterfaceCombat();
        });
    } else {
        genererStructureMatchMulti();
        
        let cardImgsList = selectedTeamIds.map(id => getCardImgUrl(id));

        if (MultiplayerManager.isHost) {
            MultiplayerManager.hostDeckReady = true;
        }

        MultiplayerManager.envoyerAction({
            type: 'DESK_READY',
            senderName: currentUser,
            deck: [...selectedTeamIds],
            cardImgs: cardImgsList,
            maxHp: [...localMatch.maxHpDeckJ1],
            atqBonus: localMatch.deckJ1AtqBonus,
            lvls: localMatch.deckJ1Lvls
        });

        let btn = document.getElementById('startMatchBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "EN ATTENTE DE L'ADVERSAIRE... ⏳";
        }

        MultiplayerManager.verifierLancementMatchSiPret();
    }
}

function genererStructureMatchBot() {
    let botDeck = [];
    for (let i = 0; i < 3; i++) { botDeck.push(`swsh8-${Math.floor(Math.random() * 250) + 1}`); }

    let hpCalculatedDeckJ1 = [];
    let hpCalculatedDeckJ2 = [];
    let botAtqBonusDeck = [];
    let botLvlsDeck = [];

    selectedTeamIds.forEach(id => {
        let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === id.toString());
        let cardPvMax = 25 + (foundCard ? (parseInt(foundCard.PV_Bonus) || 0) : 0);
        let myLvl = foundCard ? (parseInt(foundCard.Carte_Niveau) || 1) : 1;
        
        let nrg = (foundCard && foundCard.Energie !== undefined) ? parseInt(foundCard.Energie) : 100;
        let cln = (foundCard && foundCard.Proprete !== undefined) ? parseInt(foundCard.Proprete) : 100;
        if (nrg < 30 || cln < 30) cardPvMax = Math.round(cardPvMax * 0.66);
        hpCalculatedDeckJ1.push(cardPvMax);

        let minLvl = Math.max(1, myLvl - 3);
        let maxLvl = myLvl + 3;
        let botLvl = Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;
        botLvlsDeck.push(botLvl);

        let botPvBonus = 0; let botAtqBonus = 0;
        let levelsToDistribute = botLvl - 1;
        for (let l = 0; l < levelsToDistribute; l++) {
            if (Math.random() < 0.5) botPvBonus += 2;
            else botAtqBonus += 1;
        }

        hpCalculatedDeckJ2.push(25 + botPvBonus);
        botAtqBonusDeck.push(botAtqBonus);
    });

    localMatch.statut = "actif";
    localMatch.enemyName = "ROBOT-BOT 🤖";
    localMatch.myRole = "host";
    localMatch.tourA = "host";
    localMatch.hpJ1 = hpCalculatedDeckJ1[0];
    localMatch.maxHpDeckJ1 = [...hpCalculatedDeckJ1];
    localMatch.currentHpDeckJ1 = [...hpCalculatedDeckJ1];
    localMatch.hpJ2 = hpCalculatedDeckJ2[0];
    localMatch.maxHpDeckJ2 = [...hpCalculatedDeckJ2];
    localMatch.currentHpDeckJ2 = [...hpCalculatedDeckJ2];
    localMatch.botAtqBonusDeck = botAtqBonusDeck;
    localMatch.botLvlsDeck = botLvlsDeck;
    localMatch.indexJ1 = 0;
    localMatch.indexJ2 = 0;
    localMatch.deckJ1 = [...selectedTeamIds];
    localMatch.deckJ2 = botDeck;
}

function genererStructureMatchMulti() {
    let hpCalculatedDeckJ1 = [];
    let myAtqBonus = [];
    let myLvls = [];

    selectedTeamIds.forEach(id => {
        let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === id.toString());
        let cardPvMax = 25 + (foundCard ? (parseInt(foundCard.PV_Bonus) || 0) : 0);
        let myLvl = foundCard ? (parseInt(foundCard.Carte_Niveau) || 1) : 1;
        let atqBonus = foundCard ? (parseInt(foundCard.Attaque_Bonus) || 0) : 0;
        
        let nrg = (foundCard && foundCard.Energie !== undefined) ? parseInt(foundCard.Energie) : 100;
        let cln = (foundCard && foundCard.Proprete !== undefined) ? parseInt(foundCard.Proprete) : 100;
        if (nrg < 30 || cln < 30) cardPvMax = Math.round(cardPvMax * 0.66);
        
        hpCalculatedDeckJ1.push(cardPvMax);
        myAtqBonus.push(atqBonus);
        myLvls.push(myLvl);
    });

    localMatch.statut = "actif";
    localMatch.myRole = MultiplayerManager.isHost ? "host" : "guest";
    localMatch.tourA = "host";
    localMatch.hpJ1 = hpCalculatedDeckJ1[0];
    localMatch.maxHpDeckJ1 = [...hpCalculatedDeckJ1];
    localMatch.currentHpDeckJ1 = [...hpCalculatedDeckJ1];
    
    if (!localMatch.maxHpDeckJ2) {
        localMatch.maxHpDeckJ2 = [25, 25, 25];
        localMatch.currentHpDeckJ2 = [25, 25, 25];
        localMatch.hpJ2 = 25;
    }

    localMatch.deckJ1AtqBonus = myAtqBonus;
    localMatch.deckJ1Lvls = myLvls;
    localMatch.indexJ1 = 0;
    localMatch.indexJ2 = 0;
    localMatch.deckJ1 = [...selectedTeamIds];
}

function demarrerInterfaceCombat() {
    document.body.classList.add('in-battle');
    
    let nonBattleInterface = document.getElementById('nonBattleInterface');
    if (nonBattleInterface) nonBattleInterface.classList.add('d-none');
    
    let battlePhase = document.getElementById('battlePhase');
    if (battlePhase) battlePhase.classList.remove('d-none');
    
    let pName = document.getElementById('battlePlayerName');
    if (pName) pName.innerText = `${currentUser.toUpperCase()} (MOI)`;
    
    let eName = document.getElementById('battleEnemyName');
    if (eName) eName.innerText = (localMatch.enemyName || "ADVERSAIRE").toUpperCase();
    
    synchroniserVisuelsLocaux(true);
}

function recommencerNouvellePartie() {
    document.body.classList.remove('in-battle');
    if (rewardModalInst) rewardModalInst.hide();
    selectedTeamIds = [];
    location.reload();
}

function rejouerMemeDeck() {
    if (rewardModalInst) rewardModalInst.hide();
    if (isMultiplayerMode) {
        MultiplayerManager.envoyerAction({ type: 'DEMANDE_REMATCH' });
        let btnRematch = document.getElementById('btnRematchSameDeck');
        if (btnRematch) {
            btnRematch.disabled = true;
            btnRematch.innerText = "EN ATTENTE DE L'ADVERSAIRE... ⏳";
        }
    } else {
        validerMonDeck();
    }
}

function activerPouvoirManuel() {
    PouvoirManager.activerPouvoirManuel();
    if (isMultiplayerMode) {
        MultiplayerManager.envoyerAction({
            type: 'POUVOIR_ACTIVATION',
            pid: localMatch.pouvoirJ1.id,
            nomPouvoir: localMatch.pouvoirJ1.nom
        });
    }
}

function synchroniserVisuelsLocaux(afficherBandeau = true) {
    let isMyTurn = (localMatch.tourA === localMatch.myRole);

    let monIndexVis = localMatch.indexJ1 >= 3 ? 2 : localMatch.indexJ1;
    let sonIndexVis = localMatch.indexJ2 >= 3 ? 2 : localMatch.indexJ2;

    let curCardId = localMatch.deckJ1[monIndexVis];
    let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === curCardId.toString());
    
    let levelTextNode = document.getElementById('cardBattleLvlText');
    if (levelTextNode) {
        levelTextNode.innerText = "NIVEAU " + (foundCard ? (foundCard.Carte_Niveau || 1) : 1);
    }

    let enemyLevelTextNode = document.getElementById('enemyCardBattleLvlText');
    if (enemyLevelTextNode) {
        let sonNiveau = localMatch.botLvlsDeck ? (localMatch.botLvlsDeck[sonIndexVis] || 1) : 1;
        enemyLevelTextNode.innerText = "NIVEAU " + sonNiveau;
    }

    let pBonus = foundCard ? (parseInt(foundCard.Attaque_Bonus) || 0) : 0;
    let pMinDmg = PouvoirManager.ajusterDegats(10 + pBonus, true);
    let pMaxDmg = PouvoirManager.ajusterDegats(21 + pBonus, true);
    
    let playerAtqText = document.getElementById('playerAtqText');
    if (playerAtqText) playerAtqText.innerText = `⚔️ ATTAQUE : ${pMinDmg} - ${pMaxDmg}`;

    let bBonus = localMatch.botAtqBonusDeck ? (localMatch.botAtqBonusDeck[sonIndexVis] || 0) : 0;
    let bMinDmg = PouvoirManager.ajusterDegats(10 + bBonus, false);
    let bMaxDmg = PouvoirManager.ajusterDegats(21 + bBonus, false);
    
    let enemyAtqText = document.getElementById('enemyAtqText');
    if (enemyAtqText) enemyAtqText.innerText = `⚔️ ATTAQUE : ${bMinDmg} - ${bMaxDmg}`;

    const topBadge = document.getElementById('enemyPouvoirTopBadge');
    if(topBadge && localMatch.pouvoirJ2) {
        let st = localMatch.pouvoirJ2Utilise ? "UTILISÉ ✖️" : "PRÊT 🌟";
        topBadge.innerText = `${(localMatch.enemyName || 'ADVERSAIRE').toUpperCase()} : ${localMatch.pouvoirJ2.nom.toUpperCase()} [${st}]`;
    }

    const pBadge = document.getElementById('pouvoirBadge');
    if(pBadge && localMatch.pouvoirJ1) {
        let stJ1 = localMatch.pouvoirJ1Utilise ? 'UTILISÉ ✖️' : 'DISPONIBLE 🌟';
        pBadge.innerText = `TON POUVOIR : ${localMatch.pouvoirJ1.nom.toUpperCase()} (${stJ1})\n\n${localMatch.pouvoirJ1.desc}`;
    }
    const eBadge = document.getElementById('enemyPouvoirBadge');
    if(eBadge && localMatch.pouvoirJ2) {
        let stJ2 = localMatch.pouvoirJ2Utilise ? 'UTILISÉ ✖️' : 'DISPONIBLE 🌟';
        eBadge.innerText = `POUVOIR ADVERSE : ${localMatch.pouvoirJ2.nom.toUpperCase()} (${stJ2})\n\n${localMatch.pouvoirJ2.desc}`;
    }

    const btnPouvoir = document.getElementById('btnPouvoirSpecial');
    if(btnPouvoir) {
        if(localMatch.pouvoirJ1) {
            btnPouvoir.classList.remove('d-none');
            let estBloque = localMatch.toursPouvoirBloqueJoueur > 0;
            btnPouvoir.disabled = !isMyTurn || localMatch.pouvoirJ1Utilise || localMatch.statut !== "actif" || estBloque;
            
            if (estBloque) {
                btnPouvoir.innerText = "POUVOIR BLOQUÉ 🚫";
            } else if (localMatch.pouvoirJ1Utilise) {
                btnPouvoir.innerText = "POUVOIR UTILISÉ ✖️";
            } else {
                btnPouvoir.innerText = `POUVOIR : ${localMatch.pouvoirJ1.nom.toUpperCase()} 🌟`;
            }
        } else {
            btnPouvoir.classList.add('d-none');
        }
    }

    if (afficherBandeau) {
        animerBandeauTour(localMatch.tourA);
    }

    let pImg = document.getElementById('playerFighterImg');
    if (pImg) pImg.src = getCardImgUrl(localMatch.deckJ1[monIndexVis]);

    let eImg = document.getElementById('enemyFighterImg');
    if (eImg) eImg.src = getCardImgUrl(localMatch.deckJ2 ? localMatch.deckJ2[sonIndexVis] : "");

    let monPvAffiche = localMatch.indexJ1 >= 3 ? 0 : localMatch.hpJ1;
    let sonPvAffiche = localMatch.indexJ2 >= 3 ? 0 : localMatch.hpJ2;
    let monPvMaxAffiche = localMatch.indexJ1 >= 3 ? 25 : localMatch.maxHpDeckJ1[monIndexVis];
    let sonPvMaxAffiche = localMatch.indexJ2 >= 3 ? 25 : (localMatch.maxHpDeckJ2 ? localMatch.maxHpDeckJ2[sonIndexVis] : 25);

    let playerHpBar = document.getElementById('playerHpBar');
    if (playerHpBar) playerHpBar.style.width = Math.max(0, (monPvAffiche / monPvMaxAffiche * 100)) + "%"; 
    
    let playerHpText = document.getElementById('playerHpText');
    if (playerHpText) playerHpText.innerText = `${monPvAffiche} / ${monPvMaxAffiche} PV`;

    let enemyHpBar = document.getElementById('enemyHpBar');
    if (enemyHpBar) enemyHpBar.style.width = Math.max(0, (sonPvAffiche / sonPvMaxAffiche * 100)) + "%"; 
    
    let enemyHpText = document.getElementById('enemyHpText');
    if (enemyHpText) enemyHpText.innerText = `${sonPvAffiche} / ${sonPvMaxAffiche} PV`;

    let btnAtq = document.getElementById('btnAttaque');
    if (btnAtq) btnAtq.disabled = !isMyTurn;

    let btnEsq = document.getElementById('btnEsquive');
    if (btnEsq) btnEsq.disabled = !isMyTurn;

    const pMini = document.getElementById('playerMiniDeck'); 
    if (pMini) {
        pMini.innerHTML = "";
        localMatch.deckJ1.forEach((idCard, i) => {
            let statusClass = (i === localMatch.indexJ1) ? 'active-mini' : (localMatch.currentHpDeckJ1[i] <= 0 ? 'ko-mini' : '');
            pMini.innerHTML += `<img src="${getCardImgUrl(idCard)}" class="mini-card ${statusClass}">`;
        });
    }

    const eMini = document.getElementById('enemyMiniDeck'); 
    if (eMini && localMatch.deckJ2) {
        eMini.innerHTML = "";
        localMatch.deckJ2.forEach((idCard, i) => {
            let statusClass = (i === localMatch.indexJ2) ? 'active-mini' : (localMatch.currentHpDeckJ2[i] <= 0 ? 'ko-mini' : '');
            eMini.innerHTML += `<img src="${getCardImgUrl(idCard)}" class="mini-card ${statusClass}">`;
        });
    }

    if (!isMultiplayerMode && localMatch.tourA === "guest" && localMatch.statut === "actif") {
        setTimeout(decisionBot, 1500);
    }
}

function animerBandeauTour(tourActuel) {
    const bannerContainer = document.getElementById('brawlTurnBanner');
    const bannerText = document.getElementById('brawlBannerText');
    if (!bannerContainer || !bannerText) return;

    bannerContainer.style.display = 'none'; void bannerContainer.offsetWidth; bannerContainer.style.display = 'block';
    
    let isMyTurn = (tourActuel === localMatch.myRole);

    if (isMyTurn) {
        bannerText.innerText = "À TON TOUR ! 🔥"; bannerText.className = "brawl-banner-text banner-moi";
    } else {
        bannerText.innerText = `TOUR DE ${(localMatch.enemyName || 'L\'ADVERSAIRE').toUpperCase()} ⚔️`; 
        bannerText.className = "brawl-banner-text banner-adversaire";
    }
    setTimeout(() => { bannerContainer.style.display = 'none'; }, 1600);
}

function preparerAttaque() {
    let monIndexVis = localMatch.indexJ1 >= 3 ? 2 : localMatch.indexJ1;
    let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === localMatch.deckJ1[monIndexVis].toString());
    let atqBonus = foundCard ? (parseInt(foundCard.Attaque_Bonus) || 0) : 0;
    let dmg = Math.floor(Math.random() * 12) + 10 + atqBonus;
    dmg = PouvoirManager.ajusterDegats(dmg, true);
    
    let elem = ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)];
    
    if (isMultiplayerMode) {
        MultiplayerManager.envoyerAction({ type: 'COUP_JOUE', actionType: 'attaque', dmg: dmg, element: elem });
    }
    jouerCoupLocal('attaque', dmg, elem, false);
}

function decisionBot() {
    PouvoirManager.analyserEtExecuterPouvoirBot();
    if(localMatch.statut !== "actif") return; 

    let sonIndexVis = localMatch.indexJ2 >= 3 ? 2 : localMatch.indexJ2;
    if (localMatch.indexJ2 === 2 && localMatch.hpJ2 <= 12 && !localMatch.botAAssayeEsquive) {
        localMatch.botAAssayeEsquive = true; 
        jouerCoupLocal('esquive', 0, "", true);
    } else {
        let botAtqBonus = localMatch.botAtqBonusDeck[sonIndexVis];
        let dmg = Math.floor(Math.random() * 12) + 10 + botAtqBonus;
        dmg = PouvoirManager.ajusterDegats(dmg, false);
        jouerCoupLocal('attaque', dmg, ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)], true);
    }
}

function jouerCoupLocal(type, dmg = 0, element = "", recuParReseau = false) {
    let btnAtq = document.getElementById('btnAttaque');
    if (btnAtq) btnAtq.disabled = true;
    let btnEsq = document.getElementById('btnEsquive');
    if (btnEsq) btnEsq.disabled = true;

    let logCoup = ""; 
    let animDepuisMoi = !recuParReseau;
    let contreAttaqueReussie = false;

    if (type === 'attaque') {
        let esquivePreequipee = animDepuisMoi ? localMatch.esquivePreequipeeJ2 : localMatch.esquivePreequipeeJ1;
        let esquiveRafaleActive = animDepuisMoi ? localMatch.esquiveReussiCeTourJ2 : localMatch.esquiveReussiCeTourJ1;
        let esquiveClassiqueActive = animDepuisMoi ? localMatch.esquiveJ2Active : localMatch.esquiveJ1Active;
        let attaquantEstEnRafale = animDepuisMoi ? localMatch.rafaleEnCoursJ1 : localMatch.rafaleEnCoursJ2;

        if (esquivePreequipee || esquiveRafaleActive || esquiveClassiqueActive) {
            let reussite = false;

            if (esquiveRafaleActive) {
                reussite = true;
            } else if (esquiveClassiqueActive) {
                if (animDepuisMoi) localMatch.esquiveJ2Active = false;
                else localMatch.esquiveJ1Active = false;
                reussite = true;
            } else if (esquivePreequipee) {
                if (animDepuisMoi) localMatch.esquivePreequipeeJ2 = false;
                else localMatch.esquivePreequipeeJ1 = false;
                reussite = Math.random() < 0.75;
            }

            if (reussite) {
                contreAttaqueReussie = true;
                if (attaquantEstEnRafale) {
                    if (animDepuisMoi) localMatch.esquiveReussiCeTourJ2 = true;
                    else localMatch.esquiveReussiCeTourJ1 = true;
                }
                executerImpactFin(animDepuisMoi, dmg);
                logCoup = `⚡ ESQUIVE RÉUSSIE ! ${animDepuisMoi ? localMatch.enemyName : "Tu as"} renvoyé l'attaque ! ${animDepuisMoi ? currentUser : localMatch.enemyName} subit ${dmg} dégâts !`;
            } else {
                executerImpactFin(!animDepuisMoi, dmg);
                if (animDepuisMoi) localMatch.skipNextTurnJ2 = true;
                else localMatch.skipNextTurnJ1 = true;
                logCoup = `❌ ESQUIVE ÉCHOUÉE ! ${animDepuisMoi ? localMatch.enemyName : "Tu"} subis ${dmg} dégâts et le prochain tour sera sauté !`;
            }
        } else {
            logCoup = `${animDepuisMoi ? currentUser : localMatch.enemyName} lance une attaque [${element.toUpperCase()}] : ${dmg} dégâts !`;
            executerImpactFin(!animDepuisMoi, dmg);
        }
        
        lancerAnimationFX(animDepuisMoi, element, contreAttaqueReussie, logCoup, contreAttaqueReussie);
    } else {
        if (!recuParReseau && isMultiplayerMode) {
            MultiplayerManager.envoyerAction({ type: 'COUP_JOUE', actionType: 'esquive', dmg: 0, element: "" });
        }
        let chance = PouvoirManager.obtenirChanceEsquive(animDepuisMoi);
        let reussiteEsquive = (Math.random() < chance);
        
        if (animDepuisMoi) localMatch.esquiveJ1Active = reussiteEsquive;
        else localMatch.esquiveJ2Active = reussiteEsquive;

        finaliserTour(`${animDepuisMoi ? currentUser : localMatch.enemyName} tente une esquive tactique classique ! 🛡️`, false);
    }
}

function executerImpactFin(cibleEstJoueur, degats) {
    let d = parseInt(degats) || 0;
    if (cibleEstJoueur) {
        let estMort = PouvoirManager.gererEncaisserDegatsJ1(d);
        localMatch.currentHpDeckJ1[localMatch.indexJ1] = localMatch.hpJ1;
        if (estMort) {
            let prochainVivant = localMatch.currentHpDeckJ1.findIndex(hp => hp > 0);
            if(prochainVivant !== -1) {
                localMatch.indexJ1 = prochainVivant;
                localMatch.hpJ1 = localMatch.currentHpDeckJ1[prochainVivant];
                executerAnimationShatter(true, localMatch.deckJ1[prochainVivant], localMatch.deckJ1[prochainVivant]);
            } else { localMatch.indexJ1 = 3; }
        }
    } else {
        let estMort = PouvoirManager.gererEncaisserDegatsJ2(d);
        localMatch.currentHpDeckJ2[localMatch.indexJ2] = localMatch.hpJ2;
        if (estMort) {
            let prochainVivant = localMatch.currentHpDeckJ2.findIndex(hp => hp > 0);
            if(prochainVivant !== -1) {
                localMatch.indexJ2 = prochainVivant;
                localMatch.hpJ2 = localMatch.currentHpDeckJ2[prochainVivant];
                executerAnimationShatter(false, localMatch.deckJ2[prochainVivant], localMatch.deckJ2[prochainVivant]);
            } else { localMatch.indexJ2 = 3; }
        }
    }
}

function finaliserTour(logTexte, etaitUnContre = false) {
    let logBox = document.getElementById('combatLog');
    if (logBox) logBox.innerText = logTexte;
    
    PouvoirManager.decrementerTours();

    if (localMatch.indexJ1 >= 3 || localMatch.indexJ2 >= 3) {
        localMatch.statut = "termine";
        declencherFinDeMatch();
        return;
    }

    if (localMatch.rafaleEnCoursJ1) {
        localMatch.rafaleEnCoursJ1 = false;
        setTimeout(() => {
            if (logBox) logBox.innerText = "💥 POUVOIR EN RAFALE : Deuxième frappe consécutive !";
            preparerAttaque();
        }, 700);
        return;
    }

    localMatch.esquiveReussiCeTourJ1 = false;
    localMatch.esquiveReussiCeTourJ2 = false;

    let prochainTour = etaitUnContre ? localMatch.tourA : (localMatch.tourA === "host" ? "guest" : "host");

    // CORRECTION DU SKIP NEXT TURN : ALTERNANCE ROBUSTE
    if (prochainTour === "host" && localMatch.skipNextTurnJ1) {
        localMatch.skipNextTurnJ1 = false;
        prochainTour = "guest";
        if (logBox) logBox.innerText += " | 🚫 Tour de l'hôte sauté !";
    } else if (prochainTour === "guest" && localMatch.skipNextTurnJ2) {
        localMatch.skipNextTurnJ2 = false;
        prochainTour = "host";
        if (logBox) logBox.innerText += " | 🚫 Tour de l'invité sauté !";
    }

    localMatch.tourA = prochainTour;
    synchroniserVisuelsLocaux(true);
}

function declencherFinDeMatch() {
    let vainqueurEstJoueur = (localMatch.indexJ2 >= 3);
    
    let rTitle = document.getElementById('rewardTitle');
    if (rTitle) rTitle.innerText = vainqueurEstJoueur ? "🏆 VICTOIRE !" : "💀 DÉFAITE !";
    
    let rText = document.getElementById('rewardXpText');
    if (rText) rText.innerText = vainqueurEstJoueur ? "+10 XP pour ton niveau personnel !" : "+0 XP";
    
    document.body.classList.remove('in-battle');
    const summaryBox = document.getElementById('cardsXpSummary'); 
    if (summaryBox) summaryBox.innerHTML = "";
    
    cardsToUpgradeQueue = []; 
    serveurSauvegardeTerminee = false; 
    
    let btnQuit = document.getElementById('btnLobbyQuit');
    if (btnQuit) btnQuit.disabled = true;

    let btnRematch = document.getElementById('btnRematchSameDeck');
    if (btnRematch) {
        btnRematch.disabled = false;
        btnRematch.innerText = "REJOUER (MÊME DECK) ⚔️";
    }
    
    let malusEntretien = Math.floor(Math.random() * 16) + 10;

    localMatch.deckJ1.forEach((cardId, keyIdx) => {
        let c = myCollection.find(item => (item.Pokemon_API_ID || "").toString() === cardId.toString());
        if(c) {
            let oldXp = parseInt(c.Carte_XP) || 0;
            let targetXp = oldXp + 10; 
            let currentLvl = parseInt(c.Carte_Niveau) || 1;
            let nextNrg = Math.max(0, ((c.Energie !== undefined) ? parseInt(c.Energie) : 100) - malusEntretien);
            let nextCln = Math.max(0, ((c.Proprete !== undefined) ? parseInt(c.Proprete) : 100) - malusEntretien);

            c.Energie = nextNrg; c.Proprete = nextCln;
            
            let lvlUpDetecte = false;
            if(targetXp >= 100) { 
                targetXp = targetXp - 100;
                currentLvl += 1; 
                lvlUpDetecte = true;
                cardsToUpgradeQueue.push({ cardId: cardId, cardName: c.Nom_Pokemon || "CARTE", nextLvl: currentLvl }); 
            }
            c.Carte_XP = targetXp;
            c.Carte_Niveau = currentLvl;

            if (summaryBox) {
                summaryBox.innerHTML += `
                    <div class="mb-2">
                        <div class="d-flex justify-content-between small fw-bold"><span>${(c.Nom_Pokemon || "CARTE").toUpperCase()}</span><span class="text-info">XP ${oldXp} ➔ ${targetXp}/100</span></div>
                        <div class="modal-xp-container"><div id="modalBarIdx_${keyIdx}" class="modal-xp-bar" style="width: ${Math.min(100, oldXp)}%;"></div><div class="modal-xp-text">${lvlUpDetecte ? '⭐ LEVEL UP !':'PROGRESSION'}</div></div>
                        <div class="text-muted" style="font-size:0.72rem;">Fatigue post-match : Énergie: ${nextNrg}% | Propreté: ${nextCln}%</div>
                    </div>`;
            }

            setTimeout(() => {
                let barNode = document.getElementById(`modalBarIdx_${keyIdx}`);
                if(barNode) barNode.style.width = `${Math.min(100, targetXp)}%`;
            }, 400);
        }
    });

    let deckString = localMatch.deckJ1.join(',');
    
    fetch(`${API_URL}?action=attribuerXpHorsLigne&username=${encodeURIComponent(currentUser)}&xp=${vainqueurEstJoueur ? 10 : 0}&preference=${encodeURIComponent(currentUserPref)}`)
    .then(res => res.json())
    .then(data => {
        if(data && data.levelUp && data.newLevel) {
            localStorage.setItem('lastKnownLevel_' + currentUser, data.newLevel);
        }
        return fetch(`${API_URL}?action=nettoyerMatchFin&username=${encodeURIComponent(currentUser)}&deck=${deckString}&malus=${malusEntretien}`);
    })
    .then(() => { serveurSauvegardeTerminee = true; verifierQueueUpgrades(); });
    rewardModalInst.show();
}

function verifierQueueUpgrades() {
    let choiceBlock = document.getElementById('cardLevelUpChoiceBlock');
    let btnQuit = document.getElementById('btnLobbyQuit');

    if(cardsToUpgradeQueue.length > 0) {
        if (btnQuit) btnQuit.disabled = true;
        let nextUpgrade = cardsToUpgradeQueue[0];
        
        let cardNameTxt = document.getElementById('lvlUpCardNameTxt');
        if (cardNameTxt) cardNameTxt.innerText = `Félicitations ! Améliore ${nextUpgrade.cardName.toUpperCase()} vers le Niveau ${nextUpgrade.nextLvl} :`;
        
        let cardPreviewImg = document.getElementById('lvlUpCardPreviewImg');
        if (cardPreviewImg) cardPreviewImg.src = getCardImgUrl(nextUpgrade.cardId);
        
        if (choiceBlock) choiceBlock.classList.remove('d-none');
    } else {
        if (choiceBlock) choiceBlock.classList.add('d-none');
        if(serveurSauvegardeTerminee && btnQuit) {
            btnQuit.disabled = false;
            btnQuit.innerText = "RETOUR AU MENU 🕹️";
        }
    }
}

function envoyerUpgradeChoix(typeChoisi) {
    let item = cardsToUpgradeQueue.shift();
    let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === item.cardId.toString());

    if (foundCard) {
        if (typeChoisi === 'atq') {
            let curBonus = parseInt(foundCard.Attaque_Bonus) || 0;
            foundCard.Attaque_Bonus = curBonus + 1; 
        } else if (typeChoisi === 'pv') {
            let curBonus = parseInt(foundCard.PV_Bonus) || 0;
            foundCard.PV_Bonus = curBonus + 2; 
        }
    }

    fetch(`${API_URL}?action=choisirAmeliorationCarte&username=${encodeURIComponent(currentUser)}&cardId=${encodeURIComponent(item.cardId)}&choix=${typeChoisi}`)
    .then(() => { verifierQueueUpgrades(); });

    verifierQueueUpgrades();
}

function executerAnimationShatter(estMoi, idAncienneCarte, idNouvelleCarte) {
    const anchor = estMoi ? document.getElementById('myCardAnchor') : document.getElementById('enemyCardAnchor');
    const imgEl = estMoi ? document.getElementById('playerFighterImg') : document.getElementById('enemyFighterImg');
    if (!anchor || !imgEl) return;

    anchor.classList.add('shatter-card', 'glass-crack');
    setTimeout(() => {
        anchor.classList.remove('shatter-card', 'glass-crack');
        if (idNouvelleCarte) {
            imgEl.src = getCardImgUrl(idNouvelleCarte);
            anchor.style.transform = "scale(0.2)"; setTimeout(() => { anchor.style.transform = "scale(1)"; }, 50);
        }
    }, 800);
}

function lancerAnimationFX(depuisMoi, element, estUnContre, logTexte, contreAttaqueReussie = false) {
    const origine = depuisMoi ? document.getElementById('myCardAnchor') : document.getElementById('enemyCardAnchor');
    const cible = depuisMoi ? document.getElementById('enemyCardAnchor') : document.getElementById('myCardAnchor');
    
    if (!origine || !cible) {
        finaliserTour(logTexte, contreAttaqueReussie);
        return;
    }
    
    const rOrigine = origine.getBoundingClientRect(); 
    const rCible = cible.getBoundingClientRect();
    
    let emoji = '🔥', colorFX = 'var(--feu-color)';
    if (element === 'eau') { emoji = '💧'; colorFX = 'var(--eau-color)'; }
    else if (element === 'eclair') { emoji = '⚡'; colorFX = 'var(--eclair-color)'; }
    else if (element === 'feuille') { emoji = '🍃'; colorFX = 'var(--feuille-color)'; }
    
    const fx = document.createElement('div'); 
    fx.className = 'fx-projectile'; 
    fx.innerText = emoji;
    
    const startX = rOrigine.left + (rOrigine.width / 2) - 25;
    const startY = rOrigine.top + (rOrigine.height / 2) - 25;
    const targetX = rCible.left + (rCible.width / 2) - 25;
    const targetY = rCible.top + (rCible.height / 2) - 25;

    fx.style.left = `${startX}px`; 
    fx.style.top = `${startY}px`;
    document.body.appendChild(fx);

    if (contreAttaqueReussie) {
        const midX = startX + (targetX - startX) * 0.85;
        const midY = startY + (targetY - startY) * 0.85;

        setTimeout(() => {
            fx.style.transition = "all 0.38s cubic-bezier(0.25, 1, 0.5, 1)";
            fx.style.left = `${midX}px`;
            fx.style.top = `${midY}px`;
            fx.style.transform = "scale(1.4) rotate(180deg)";
        }, 40);

        setTimeout(() => {
            fx.style.transition = "all 0.38s cubic-bezier(0.5, 0, 0.75, 0)";
            fx.style.left = `${startX}px`;
            fx.style.top = `${startY}px`;
            fx.style.transform = "scale(1.9) rotate(720deg)";
        }, 420);

        setTimeout(() => {
            fx.remove();
            genererExplosionParticules(startX + 25, startY + 25, colorFX);
            const attaquantCardNode = depuisMoi ? document.getElementById('myFighterCardNode') : document.getElementById('enemyFighterCardNode');
            if (attaquantCardNode) {
                attaquantCardNode.classList.add('shake-card');
                setTimeout(() => { attaquantCardNode.classList.remove('shake-card'); }, 400);
            }
            finaliserTour(logTexte, true);
        }, 820);

    } else {
        setTimeout(() => { 
            fx.style.transition = "all 0.65s cubic-bezier(0.25, 1, 0.5, 1)";
            fx.style.left = `${targetX}px`; 
            fx.style.top = `${targetY}px`; 
            fx.style.transform = "scale(1.7) rotate(360deg)"; 
        }, 50);

        setTimeout(() => { 
            fx.remove(); 
            genererExplosionParticules(targetX + 25, targetY + 25, colorFX); 
            const cibleCardNode = depuisMoi ? document.getElementById('enemyFighterCardNode') : document.getElementById('myFighterCardNode');
            if (cibleCardNode) {
                cibleCardNode.classList.add('shake-card');
                setTimeout(() => { cibleCardNode.classList.remove('shake-card'); }, 400);
            }
            finaliserTour(logTexte, false);
        }, 720);
    }
}

function genererExplosionParticules(centerX, centerY, couleur) {
    const nbParticules = 22;
    for (let i = 0; i < nbParticules; i++) {
        const particule = document.createElement('div'); particule.className = 'fx-particle'; particule.style.backgroundColor = couleur;
        particule.style.left = `${centerX}px`; particule.style.top = `${centerY}px`;
        const size = Math.floor(Math.random() * 8) + 4; particule.style.width = `${size}px`; particule.style.height = `${size}px`;
        document.body.appendChild(particule);
        const angle = Math.random() * Math.PI * 2; const distance = Math.floor(Math.random() * 80) + 40;
        const targetX = centerX + Math.cos(angle) * distance; const targetY = centerY + Math.sin(angle) * distance;
        particule.animate([ { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { left: `${targetX}px`, top: `${targetY}px`, transform: 'translate(-50%, -50%) scale(0)', opacity: 0 } ], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)', fill: 'forwards' });
        setTimeout(() => particule.remove(), 900);
    }
}

function getCardImgUrl(cardId) {
    if (!cardId) return "https://placehold.co/280x390/151824/8b5cf6?text=Image+Non+Disponible";
    
    let found = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === cardId.toString());
    if (found && (found.Image_URL || found.Image)) return found.Image_URL || found.Image;
    
    if (opponentCardImgsMap && opponentCardImgsMap[cardId.toString()]) {
        return opponentCardImgsMap[cardId.toString()];
    }

    let cardStr = cardId.toString();
    if (cardStr.startsWith('http://') || cardStr.startsWith('https://')) return cardStr;
    if (cardStr.startsWith('swsh8-')) return `https://images.pokemontcg.io/swsh8/${cardStr.replace('swsh8-', '')}_hires.png`;
    if (!isNaN(cardStr)) return `https://images.pokemontcg.io/swsh8/${cardStr}_hires.png`;
    
    return "https://placehold.co/280x390/151824/8b5cf6?text=Image+Non+Disponible";
}
