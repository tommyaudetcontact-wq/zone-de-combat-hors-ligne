/**
 * zonedecombathorsligne.js - Logique globale du match et gestion RPG (Hors Pouvoirs)
 */

const API_URL = "https://script.google.com/macros/s/AKfycbzKgKRkfVyQuNCrc0T13iH1orPFeWIZAK4kB_emnRFimN-ae_HzISIqUzZ_g1aWgPwHjg/exec";
let currentUser = null, selectedTeamIds = [], myCollection = [];
let rewardModalInst = null, slotMachineModalInst = null, isCardsLoaded = false, cardsToUpgradeQueue = [];
let serveurSauvegardeTerminee = false;

let localMatch = {
    statut: "lobby", hpJ1: 25, maxHpDeckJ1: [25, 25, 25], hpJ2: 25, maxHpDeckJ2: [25, 25, 25],
    botAtqBonusDeck: [0, 0, 0], botLvlsDeck: [1, 1, 1],
    indexJ1: 0, indexJ2: 0, deckJ1: [], deckJ2: [], tourA: "J1", dernierCoup: "", 
    esquiveJ1Active: false, esquiveJ2Active: false, botAAssayeEsquive: false,
    secondSouffleActif: false, boostEsquivePapillon: false, idCartePeauDeRock: null, vengeanceActiveJoueur: false,
    botSecondSouffleActif: false, botBoostEsquivePapillon: false, idCarteBotPeauDeRock: null, vengeanceActiveBot: false,
    toursASkipJ1: 0, toursASkipJ2: 0, rafaleEnCours: false
};

window.addEventListener('DOMContentLoaded', () => {
    rewardModalInst = new bootstrap.Modal(document.getElementById('rewardModal'));
    slotMachineModalInst = new bootstrap.Modal(document.getElementById('slotMachineModal'));
    const s1 = document.getElementById('usernameSelect');
    if(s1) {
        s1.innerHTML = '<option value="">Connexion au serveur...</option>';
        fetch(`${API_URL}?action=getMembres`).then(res => res.json()).then(membres => {
            s1.innerHTML = '<option value="">-- Qui es-tu ? --</option>';
            membres.filter(m => m && m.Nom !== 'Admin').forEach(m => {
                s1.innerHTML += `<option value="${m.Nom}">${m.Nom}</option>`;
            });
        }).catch(err => { console.error("Erreur membres:", err); });
    }
});

function triggerBrawlNotification(msg, colorClass = "banner-moi") {
    const bannerContainer = document.getElementById('brawlTurnBanner');
    const bannerText = document.getElementById('brawlBannerText');
    if(!bannerContainer || !bannerText) return;
    bannerContainer.style.display = 'none'; void bannerContainer.offsetWidth; bannerContainer.style.display = 'block';
    bannerText.innerText = msg.toUpperCase(); bannerText.className = `brawl-banner-text ${colorClass}`;
    setTimeout(() => { bannerContainer.style.display = 'none'; }, 1600);
}

function animerBandeauTour(tourActuel) {
    const bannerContainer = document.getElementById('brawlTurnBanner');
    const bannerText = document.getElementById('brawlBannerText');
    if(!bannerContainer || !bannerText) return;
    bannerContainer.style.display = 'none'; void bannerContainer.offsetWidth; bannerContainer.style.display = 'block';
    if (tourActuel === "J1") {
        bannerText.innerText = "À TON TOUR ! 🔥"; bannerText.className = "brawl-banner-text banner-moi";
    } else {
        bannerText.innerText = `TOUR DU BOT 🤖`; bannerText.className = "brawl-banner-text banner-adversaire";
    }
    setTimeout(() => { bannerContainer.style.display = 'none'; }, 1600);
}

function handleLogin() {
    currentUser = document.getElementById('usernameSelect').value; if(!currentUser) return;
    document.getElementById('loginPage').classList.add('d-none'); 
    document.getElementById('headerBar').classList.remove('d-none');
    document.getElementById('lobbyPhase').classList.remove('d-none');
    document.getElementById('displayUsername').innerText = currentUser.toUpperCase();
    chargerCartesDuJoueur();
}

function chargerCartesDuJoueur() {
    const botBtn = document.querySelector("#lobbyPhase button");
    if(botBtn) { botBtn.disabled = true; botBtn.innerText = "CHARGEMENT... ⏳"; }
    fetch(`${API_URL}?action=getCollection`).then(res => res.json()).then(cards => {
        myCollection = cards.filter(c => (c.Nom_Joueur || "").toLowerCase() === currentUser.toLowerCase());
        isCardsLoaded = true; 
        if(botBtn) { botBtn.disabled = false; botBtn.innerText = "DÉFIER LE BOT 🤖"; }
    });
}

function retourLobby() {
    document.getElementById('battlePhase').classList.add('d-none');
    document.getElementById('setupPhase').classList.add('d-none');
    document.getElementById('nonBattleInterface').classList.remove('d-none');
    document.getElementById('lobbyPhase').classList.remove('d-none');
}

function lancerConfigurationDeck() {
    if (!isCardsLoaded) return;
    document.getElementById('lobbyPhase').classList.add('d-none');
    document.getElementById('setupPhase').classList.remove('d-none');
    renderGrid();
}

function ouvrirSlotMachineAvantMatch() {
    if(slotMachineModalInst) slotMachineModalInst.show();
    if (typeof lancerAnimationSlotMachine === 'function') { lancerAnimationSlotMachine(); }
}

function renderGrid() {
    const container = document.getElementById('selectionGrid'); if(!container) return;
    container.innerHTML = "";
    myCollection.forEach((c) => {
        let img = c.Image_URL || c.Image; let id = c.Pokemon_API_ID;
        let isSel = selectedTeamIds.includes(id) ? 'selected' : '';
        let nrg = (c.Energie !== undefined && c.Energie !== "") ? parseInt(c.Energie) : 100;
        let cln = (c.Proprete !== undefined && c.Proprete !== "") ? parseInt(c.Proprete) : 100;
        let condTxt = "Bon état"; let condStyle = "color:#10D010;";
        if(nrg < 30 || cln < 30) { condTxt = "Mauvais état ⚠️"; condStyle = "color:#FF007F;"; }
        else if(nrg < 60 || cln < 60) { condTxt = "État Moyen ⏳"; condStyle = "color:#FFF200;"; }

        container.innerHTML += `
            <div class="col text-center">
                <div class="pokemon-card-wrapper ${isSel}" onclick="toggleCard('${id}')">
                    <img src="${img}" class="pokemon-card-img">
                </div>
                <div class="small fw-bold mt-1" style="${condStyle}">${condTxt}</div>
            </div>`;
    });
}

function toggleCard(id) {
    if(selectedTeamIds.includes(id)) selectedTeamIds = selectedTeamIds.filter(i => i !== id); 
    else if (selectedTeamIds.length < 3) selectedTeamIds.push(id);
    renderGrid();
    const startBtn = document.getElementById('startMatchBtn');
    if(startBtn) {
        startBtn.innerText = `LANCER LE COMBAT (${selectedTeamIds.length} / 3)`;
        startBtn.disabled = selectedTeamIds.length !== 3;
    }
}

function validerMonDeck() {
    if(slotMachineModalInst) slotMachineModalInst.hide();
    let botDeck = [];
    for (let i = 0; i < 3; i++) { botDeck.push(`swsh8-${Math.floor(Math.random() * 250) + 1}`); }

    let hpCalculatedDeckJ1 = []; let hpCalculatedDeckJ2 = [];
    let botAtqBonusDeck = []; let botLvlsDeck = [];

    selectedTeamIds.forEach(id => {
        let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === id.toString());
        let cardPvMax = 25 + (foundCard ? (parseInt(foundCard.PV_Bonus) || 0) : 0);
        let myLvl = foundCard ? (parseInt(foundCard.Carte_Niveau) || 1) : 1;
        let nrg = (foundCard && foundCard.Energie !== undefined) ? parseInt(foundCard.Energie) : 100;
        let cln = (foundCard && foundCard.Proprete !== undefined) ? parseInt(foundCard.Proprete) : 100;
        if (nrg < 30 || cln < 30) cardPvMax = Math.round(cardPvMax * 0.66);
        hpCalculatedDeckJ1.push(cardPvMax);

        let roll = Math.floor(Math.random() * 3) - 1; let botLvl = myLvl + roll;
        if(botLvl < 1) botLvl = 1; botLvlsDeck.push(botLvl);

        let botPvBonus = 0; let botAtqBonus = 0; let levelsToDistribute = botLvl - 1;
        for(let l=0; l < levelsToDistribute; l++) {
            if(Math.random() < 0.5) botPvBonus += 4; else botAtqBonus += 1;
        }
        hpCalculatedDeckJ2.push(25 + botPvBonus); botAtqBonusDeck.push(botAtqBonus);
    });

    localMatch = {
        statut: "actif", hpJ1: hpCalculatedDeckJ1[0], maxHpDeckJ1: hpCalculatedDeckJ1, 
        hpJ2: hpCalculatedDeckJ2[0], maxHpDeckJ2: hpCalculatedDeckJ2,
        botAtqBonusDeck: botAtqBonusDeck, botLvlsDeck: botLvlsDeck,
        indexJ1: 0, indexJ2: 0, deckJ1: [...selectedTeamIds], deckJ2: botDeck,
        tourA: "J1", dernierCoup: "Le combat commence !", esquiveJ1Active: false, esquiveJ2Active: false,
        botAAssayeEsquive: false,
        secondSouffleActif: false, boostEsquivePapillon: false, idCartePeauDeRock: null, vengeanceActiveJoueur: false,
        botSecondSouffleActif: false, botBoostEsquivePapillon: false, idCarteBotPeauDeRock: null, vengeanceActiveBot: false,
        toursASkipJ1: 0, toursASkipJ2: 0, rafaleEnCours: false
    };

    document.getElementById('nonBattleInterface').classList.add('d-none');
    document.getElementById('battlePhase').classList.remove('d-none');
    document.getElementById('battleEnemyName').innerText = "ROBOT-BOT 🤖";
    document.getElementById('battlePlayerName').innerText = currentUser.toUpperCase();

    if(typeof initBoutonsPouvoirsMatch === 'function') {
        initBoutonsPouvoirsMatch();
    }
    synchroniserVisuelsLocaux();
}

function synchroniserVisuelsLocaux() {
    let isMoi = (localMatch.tourA === "J1");
    let monIndexVis = localMatch.indexJ1 >= 3 ? 2 : localMatch.indexJ1;
    let sonIndexVis = localMatch.indexJ2 >= 3 ? 2 : localMatch.indexJ2;

    let curCardId = localMatch.deckJ1[monIndexVis];
    let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === curCardId.toString());
    let anchor = document.getElementById('myCardAnchor');
    let statusTextNode = document.getElementById('cardBattleStatusText');
    let levelTextNode = document.getElementById('cardBattleLvlText');
    let enemyLevelTextNode = document.getElementById('enemyCardBattleLvlText');
    
    if(anchor) anchor.className = "pokemon-card-wrapper";
    if (foundCard) {
        if(levelTextNode) levelTextNode.innerText = "NIVEAU " + (foundCard.Carte_Niveau || 1);
        let nrg = (foundCard.Energie !== undefined) ? parseInt(foundCard.Energie) : 100;
        let cln = (foundCard.Proprete !== undefined) ? parseInt(foundCard.Proprete) : 100;
        if(nrg < 30 || cln < 30) {
            if(anchor) anchor.classList.add('wrapper-mauvais');
            if(statusTextNode) statusTextNode.innerHTML = "<span style='color:var(--brawl-pink);'>ÉTAT : MAUVAIS (ATQ & PV BRIDÉS ⚠️)</span>";
        } else if(nrg < 60 || cln < 60) {
            if(anchor) anchor.classList.add('wrapper-moyen');
            if(statusTextNode) statusTextNode.innerHTML = "<span style='color:var(--brawl-yellow);'>ÉTAT : MOYEN ⏳</span>";
        } else { 
            if(statusTextNode) statusTextNode.innerHTML = "<span style='color:var(--brawl-green);'>ÉTAT : EXCELLENT 🟢</span>"; 
        }
    } else { if(levelTextNode) levelTextNode.innerText = "NIVEAU 1"; }

    if(enemyLevelTextNode) enemyLevelTextNode.innerText = "NIVEAU " + localMatch.botLvlsDeck[sonIndexVis];
    
    const banner = document.getElementById('brawlTurnBanner');
    if(banner && banner.style.display !== 'block') {
        animerBandeauTour(localMatch.tourA);
    }

    const pImg = document.getElementById('playerFighterImg');
    const eImg = document.getElementById('enemyFighterImg');
    if(pImg) pImg.src = getCardImgUrl(localMatch.deckJ1[monIndexVis]);
    if(eImg) eImg.src = getCardImgUrl(localMatch.deckJ2[sonIndexVis]);

    let monPvAffiche = localMatch.indexJ1 >= 3 ? 0 : localMatch.hpJ1;
    let sonPvAffiche = localMatch.indexJ2 >= 3 ? 0 : localMatch.hpJ2;
    let monPvMaxAffiche = localMatch.indexJ1 >= 3 ? 25 : localMatch.maxHpDeckJ1[monIndexVis];
    let sonPvMaxAffiche = localMatch.indexJ2 >= 3 ? 25 : localMatch.maxHpDeckJ2[sonIndexVis];

    const pBar = document.getElementById('playerHpBar');
    const pText = document.getElementById('playerHpText');
    const eBar = document.getElementById('enemyHpBar');
    const eText = document.getElementById('enemyHpText');

    if(pBar) pBar.style.width = (monPvAffiche / monPvMaxAffiche * 100) + "%"; 
    if(pText) pText.innerText = `${monPvAffiche} / ${monPvMaxAffiche} PV`;
    if(eBar) eBar.style.width = (sonPvAffiche / sonPvMaxAffiche * 100) + "%"; 
    if(eText) eText.innerText = `${sonPvAffiche} / ${sonPvMaxAffiche} PV`;

    const btnA = document.getElementById('btnAttaque');
    const btnE = document.getElementById('btnEsquive');
    if(btnA) btnA.disabled = !isMoi;
    if(btnE) btnE.disabled = !isMoi;

    const pMini = document.getElementById('playerMiniDeck'); 
    if(pMini) {
        pMini.innerHTML = "";
        localMatch.deckJ1.forEach((idCard, i) => {
            let statusClass = (i === localMatch.indexJ1) ? 'active-mini' : (i < localMatch.indexJ1 ? 'ko-mini' : '');
            pMini.innerHTML += `<img src="${getCardImgUrl(idCard)}" class="mini-card ${statusClass}">`;
        });
    }

    const eMini = document.getElementById('enemyMiniDeck'); 
    if(eMini) {
        eMini.innerHTML = "";
        localMatch.deckJ2.forEach((idCard, i) => {
            let statusClass = (i === localMatch.indexJ2) ? 'active-mini' : (i < localMatch.indexJ2 ? 'ko-mini' : '');
            eMini.innerHTML += `<img src="${getCardImgUrl(idCard)}" class="mini-card ${statusClass}">`;
        });
    }

    if (localMatch.tourA === "J2" && localMatch.statut === "actif") setTimeout(decisionBot, 1500);
}

function preparerAttaque() {
    let monIndexVis = localMatch.indexJ1 >= 3 ? 2 : localMatch.indexJ1;
    let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === localMatch.deckJ1[monIndexVis].toString());
    let atqBonus = foundCard ? (parseInt(foundCard.Attaque_Bonus) || 0) : 0;
    let nrg = (foundCard && foundCard.Energie !== undefined) ? parseInt(foundCard.Energie) : 100;
    let cln = (foundCard && foundCard.Proprete !== undefined) ? parseInt(foundCard.Proprete) : 100;
    
    let dmg = Math.floor(Math.random() * 12) + 10 + atqBonus;
    if (nrg < 30 || cln < 30) dmg = Math.round(dmg * 0.66);
    if (localMatch.secondSouffleActif) { dmg = Math.round(dmg * 1.25); }
    
    jouerCoupLocal('attaque', dmg, ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)]);
}

function decisionBot() {
    if (localMatch.toursASkipJ2 > 0) {
        localMatch.toursASkipJ2--;
        document.getElementById('combatLog').innerText = `⏳ Le Bot est étourdi ! Son tour est sauté (${localMatch.toursASkipJ2} restants).`;
        localMatch.tourA = "J1";
        synchroniserVisuelsLocaux();
        return;
    }

    if (typeof evaluerPouvoirBot === 'function') {
        let aUtilisePouvoir = evaluerPouvoirBot(); if (aUtilisePouvoir) return;
    }

    let sonIndexVis = localMatch.indexJ2 >= 3 ? 2 : localMatch.indexJ2;
    let unJoueurASansIssue = (typeof pouvoirSelectionne !== 'undefined' && (pouvoirSelectionne === 'sans_issue' || botPouvoir === 'sans_issue'));

    if (localMatch.indexJ2 === 2 && localMatch.hpJ2 <= 12 && !localMatch.botAAssayeEsquive && !unJoueurASansIssue) {
        localMatch.botAAssayeEsquive = true; jouerCoupLocal('esquive');
    } else {
        let botAtqBonus = localMatch.botAtqBonusDeck[sonIndexVis];
        let dmg = Math.floor(Math.random() * 12) + 10 + botAtqBonus;
        if (localMatch.botSecondSouffleActif) { dmg = Math.round(dmg * 1.25); }
        jouerCoupLocal('attaque', dmg, ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)]);
    }
}

function jouerCoupLocal(type, dmg = 0, element = "") {
    const btnA = document.getElementById('btnAttaque');
    const btnE = document.getElementById('btnEsquive');
    if(btnA) btnA.disabled = true; if(btnE) btnE.disabled = true;
    let logCoup = ""; let animDepuisMoi = (localMatch.tourA === "J1");
    let contreAttaqueReussie = false;

    if (type === 'attaque') {
        let esquiveActive = animDepuisMoi ? localMatch.esquiveJ2Active : localMatch.esquiveJ1Active;
        localMatch.esquiveJ1Active = false; localMatch.esquiveJ2Active = false;

        if (!animDepuisMoi && localMatch.peauDeRockActive && localMatch.idCartePeauDeRock === localMatch.deckJ1[localMatch.indexJ1]) {
            dmg = Math.round(dmg * 0.5);
        }
        if (animDepuisMoi && localMatch.botPeauDeRockActive && localMatch.idCarteBotPeauDeRock === localMatch.deckJ2[localMatch.indexJ2]) {
            dmg = Math.round(dmg * 0.5);
        }

        if (esquiveActive) {
            contreAttaqueReussie = true;
            logCoup = `L'esquive était active ! CONTRE-ATTAQUE ! ${animDepuisMoi ? "Le Bot" : currentUser} subit ${dmg} dégâts ! ⚡`;
            infligerDegatsDirects(!animDepuisMoi, dmg);
        } else {
            logCoup = `${animDepuisMoi ? currentUser : "Le Bot"} lance une attaque [${element.toUpperCase()}] : ${dmg} dégâts !`;
            infligerDegatsDirects(animDepuisMoi, dmg);
        }
        lancerAnimationFX(animDepuisMoi, element, esquiveActive, logCoup, contreAttaqueReussie);
    } else {
        let tauxEsquive = 0.333;
        if (animDepuisMoi && localMatch.boostEsquivePapillon) { tauxEsquive = 0.75; localMatch.boostEsquivePapillon = false; }
        if (!animDepuisMoi && localMatch.botBoostEsquivePapillon) { tauxEsquive = 0.75; localMatch.botBoostEsquivePapillon = false; }

        if (typeof pouvoirSelectionne !== 'undefined' && (pouvoirSelectionne === 'sans_issue' || botPouvoir === 'sans_issue')) {
            tauxEsquive = 0;
        }

        let reussiteEsquive = (Math.random() < tauxEsquive);
        if (animDepuisMoi) localMatch.esquiveJ1Active = reussiteEsquive; else localMatch.esquiveJ2Active = reussiteEsquive;
        
        finaliserTour(`${animDepuisMoi ? currentUser : "Le Bot"} tente une esquive tactique ! 🛡️`, false);
    }
}

function infligerDegatsDirects(versLeBot, forceDmg) {
    if (versLeBot) {
        localMatch.hpJ2 -= forceDmg;
        if (localMatch.hpJ2 <= 0) {
            if (localMatch.vengeanceActiveBot) {
                localMatch.vengeanceActiveBot = false;
                localMatch.hpJ1 = Math.round(localMatch.hpJ1 / 2);
                localMatch.secondSouffleActif = false; 
                triggerBrawlNotification("MALÉDICTION : VENGEANCE SUBIE ! 💀", "banner-adversaire");
            }
            localMatch.indexJ2 += 1;
            if (localMatch.indexJ2 < 3) localMatch.hpJ2 = localMatch.maxHpDeckJ2[localMatch.indexJ2];
            executerAnimationShatter(false, localMatch.deckJ2[localMatch.indexJ2 - 1], localMatch.deckJ2[localMatch.indexJ2]);
        }
    } else {
        localMatch.hpJ1 -= forceDmg;
        if (localMatch.hpJ1 <= 0) {
            if (localMatch.vengeanceActiveJoueur) {
                localMatch.vengeanceActiveJoueur = false;
                localMatch.hpJ2 = Math.round(localMatch.hpJ2 / 2);
                let sonIndex = localMatch.indexJ2;
                localMatch.botAtqBonusDeck[sonIndex] = Math.round(localMatch.botAtqBonusDeck[sonIndex] * 0.75);
                triggerBrawlNotification("VENGEANCE REUSSIE ! 💀", "banner-moi");
            }
            localMatch.indexJ1 += 1;
            if (localMatch.indexJ1 < 3) localMatch.hpJ1 = localMatch.maxHpDeckJ1[localMatch.indexJ1];
            executerAnimationShatter(true, localMatch.deckJ1[localMatch.indexJ1 - 1], localMatch.deckJ1[localMatch.indexJ1]);
        }
    }
}

function finaliserTour(logTexte, etaitUnContre = false) {
    document.getElementById('combatLog').innerText = logTexte;
    if (localMatch.indexJ1 >= 3 || localMatch.indexJ2 >= 3) {
        localMatch.statut = "termine"; declencherFinDeMatch();
    } else {
        if (localMatch.rafaleEnCours === true) {
            synchroniserVisuelsLocaux();
            return;
        }

        if (!etaitUnContre) {
            let prochainTourJ2 = (localMatch.tourA === "J1");
            
            if (prochainTourJ2 && localMatch.toursASkipJ2 > 0) {
                localMatch.toursASkipJ2--;
                document.getElementById('combatLog').innerText += `\n⏳ Le tour du Bot est sauté par la Rafale Temporelle (${localMatch.toursASkipJ2} restants). À toi !`;
                localMatch.tourA = "J1";
            } else if (!prochainTourJ2 && localMatch.toursASkipJ1 > 0) {
                localMatch.toursASkipJ1--;
                document.getElementById('combatLog').innerText += `\n⏳ Ton tour est sauté par ta Rafale Temporelle (${localMatch.toursASkipJ1} restants). Le Bot attaque !`;
                localMatch.tourA = "J2";
            } else {
                localMatch.tourA = prochainTourJ2 ? "J2" : "J1";
            }
        }
        synchroniserVisuelsLocaux();
    }
}

function declencherFinDeMatch() {
    let vainqueurEstJoueur = (localMatch.indexJ2 >= 3);
    document.getElementById('rewardTitle').innerText = vainqueurEstJoueur ? "🏆 VICTOIRE !" : "💀 DÉFAITE !";
    document.getElementById('rewardXpText').innerText = vainqueurEstJoueur ? "+10 XP pour ton niveau personnel !" : "+0 XP (Essaie encore !)";
    
    const summaryBox = document.getElementById('cardsXpSummary'); if(summaryBox) summaryBox.innerHTML = "";
    cardsToUpgradeQueue = []; 
    serveurSauvegardeTerminee = false; 
    
    document.getElementById('btnLobbyQuit').disabled = true;
    document.getElementById('btnLobbyRejouerMeme').disabled = true;
    document.getElementById('btnLobbyRejouerMeme').innerText = "SAUVEGARDE EN COURS... 💾";
    
    let malusEntretien = Math.floor(Math.random() * 16) + 10;

    localMatch.deckJ1.forEach((cardId, keyIdx) => {
        let c = myCollection.find(item => (item.Pokemon_API_ID || "").toString() === cardId.toString());
        if(c) {
            let oldXp = parseInt(c.Carte_XP) || 0; let targetXp = oldXp + 10; let currentLvl = parseInt(c.Carte_Niveau) || 1;
            let currentNrg = (c.Energie !== undefined) ? parseInt(c.Energie) : 100;
            let currentCln = (c.Proprete !== undefined) ? parseInt(c.Proprete) : 100;
            let nextNrg = Math.max(0, currentNrg - malusEntretien); let nextCln = Math.max(0, currentCln - malusEntretien);

            let lvlUpDetecte = false;
            if(targetXp >= 100) { 
                targetXp = 0; 
                currentLvl += 1; 
                lvlUpDetecte = true; 
                cardsToUpgradeQueue.push({ cardId: cardId, cardName: c.Nom_Pokemon, nextLvl: currentLvl }); 
            }

            if(summaryBox) {
                summaryBox.innerHTML += `
                    <div class="mb-2">
                        <div class="d-flex justify-content-between small fw-bold"><span>${c.Nom_Pokemon.toUpperCase()}</span><span class="text-info">XP ${oldXp} ➔ ${targetXp}/100</span></div>
                        <div class="modal-xp-container"><div id="modalBarIdx_${keyIdx}" class="modal-xp-bar"></div><div class="modal-xp-text">${lvlUpDetecte ? '⭐ LEVEL UP !':'PROGRESSION'}</div></div>
                        <div class="text-muted" style="font-size:0.72rem;">Fatigue post-match : Énergie: ${nextNrg}% | Propreté: ${nextCln}%</div>
                    </div>`;
            }
            
            setTimeout(() => {
                let barNode = document.getElementById(`modalBarIdx_${keyIdx}`);
                if(barNode) barNode.style.width = `${Math.min(100, targetXp)}%`;
            }, 400);
        }
    });

    let deckString = localMatch.deckJ1.join(','); let gainGlobalXp = vainqueurEstJoueur ? 10 : 0;
    
    fetch(`${API_URL}?action=attribuerXpHorsLigne&username=${encodeURIComponent(currentUser)}&xp=${gainGlobalXp}`)
    .then(res => res.json()).then(data => {
        if(data && data.levelUp && data.nouvelleCarte) {
            document.getElementById('rewardCardImg').src = `https://images.pokemontcg.io/swsh8/${data.nouvelleCarte}_hires.png`;
            document.getElementById('levelUpSection').classList.remove('d-none');
        } else { document.getElementById('levelUpSection').classList.add('d-none'); }
        return fetch(`${API_URL}?action=nettoyerMatchFin&username=${encodeURIComponent(currentUser)}&deck=${deckString}&malus=${malusEntretien}`);
    }).then(() => { 
        serveurSauvegardeTerminee = true; 
        OuvrirProchainUpgradeInterface(); 
    }).catch(err => {
        console.error(err);
        serveurSauvegardeTerminee = true;
        OuvrirProchainUpgradeInterface();
    });

    rewardModalInst.show();
}

function OuvrirProchainUpgradeInterface() {
    const block = document.getElementById('cardLevelUpChoiceBlock');
    if(!block) return;

    if (cardsToUpgradeQueue.length > 0) {
        let currentItem = cardsToUpgradeQueue[0]; 
        document.getElementById('lvlUpCardNameTxt').innerText = `${currentItem.cardName.toUpperCase()} monte au Niveau ${currentItem.nextLvl} !`;
        document.getElementById('lvlUpCardPreviewImg').src = getCardImgUrl(currentItem.cardId);
        
        block.classList.remove('d-none');
        document.getElementById('btnLobbyQuit').disabled = true;
        document.getElementById('btnLobbyRejouerMeme').disabled = true;
        document.getElementById('btnLobbyRejouerMeme').innerText = "CHOIX DE STATS REQUIS ⏳";
    } else {
        block.classList.add('d-none');
        if(serveurSauvegardeTerminee) {
            document.getElementById('btnLobbyQuit').disabled = false;
            document.getElementById('btnLobbyRejouerMeme').disabled = false;
            document.getElementById('btnLobbyRejouerMeme').innerText = "REFAIRE UN MATCH (Même équipe) 🔁";
        }
    }
}

function envoyerUpgradeChoix(typeChoisi) {
    if(cardsToUpgradeQueue.length === 0) return;
    let item = cardsToUpgradeQueue.shift(); 
    
    document.getElementById('cardLevelUpChoiceBlock').classList.add('d-none');

    fetch(`${API_URL}?action=choisirAmeliorationCarte&username=${encodeURIComponent(currentUser)}&cardId=${encodeURIComponent(item.cardId)}&choix=${typeChoisi}`)
    .then(() => { 
        OuvrirProchainUpgradeInterface(); 
    }).catch(() => {
        OuvrirProchainUpgradeInterface();
    });
}

function rejouerDirectMemeEquipe() {
    if(rewardModalInst) rewardModalInst.hide();
    fetch(`${API_URL}?action=getCollection`).then(res => res.json()).then(cards => {
        myCollection = cards.filter(c => (c.Nom_Joueur || "").toLowerCase() === currentUser.toLowerCase());
        ouvrirSlotMachineAvantMatch();
    });
}

function executerAnimationShatter(estMoi, idAncienneCarte, idNouvelleCarte) {
    const anchor = estMoi ? document.getElementById('myCardAnchor') : document.getElementById('enemyCardAnchor');
    const imgEl = estMoi ? document.getElementById('playerFighterImg') : document.getElementById('enemyFighterImg');
    if(anchor) anchor.classList.add('shatter-card', 'glass-crack');
    setTimeout(() => {
        if(anchor) anchor.classList.remove('shatter-card', 'glass-crack');
        if (idNouvelleCarte && imgEl) {
            imgEl.src = getCardImgUrl(idNouvelleCarte);
            anchor.style.transform = "scale(0.2)"; setTimeout(() => { anchor.style.transform = "scale(1)"; }, 50);
        }
    }, 800);
}

function lancerAnimationFX(depuisMoi, element, estUnContre, logTexte, contreAttaqueReussie = false) {
    const origine = (depuisMoi && !contreAttaqueReussie) || (!depuisMoi && contreAttaqueReussie) ? document.getElementById('myCardAnchor') : document.getElementById('enemyCardAnchor');
    const cible = (depuisMoi && !contreAttaqueReussie) || (!depuisMoi && contreAttaqueReussie) ? document.getElementById('enemyCardAnchor') : document.getElementById('myCardAnchor');
    const cibleCardNode = (depuisMoi && !contreAttaqueReussie) || (!depuisMoi && contreAttaqueReussie) ? document.getElementById('enemyFighterCardNode') : document.getElementById('myFighterCardNode');
    if (!origine || !cible) return;
    const rOrigine = origine.getBoundingClientRect(); const rCible = cible.getBoundingClientRect();
    
    let emoji = '🔥', colorFX = 'var(--feu-color)';
    if (element === 'eau') { emoji = '💧'; colorFX = 'var(--eau-color)'; }
    else if (element === 'eclair') { emoji = '⚡'; colorFX = 'var(--eclair-color)'; }
    else if (element === 'feuille') { emoji = '🍃'; colorFX = 'var(--feuille-color)'; }
    
    const fx = document.createElement('div'); fx.className = 'fx-projectile'; fx.innerText = emoji;
    fx.style.left = `${rOrigine.left + (rOrigine.width / 2) - 25}px`; fx.style.top = `${rOrigine.top + (rOrigine.height / 2) - 25}px`;
    document.body.appendChild(fx);
    
    setTimeout(() => { fx.style.left = `${rCible.left + (rCible.width / 2) - 25}px`; fx.style.top = `${rCible.top + (rCible.height / 2) - 25}px`; fx.style.transform = "scale(1.7) rotate(360deg)"; }, 50);
    
    setTimeout(() => { 
        fx.remove(); genererExplosionParticules(rCible.left + (rCible.width / 2), rCible.top + (rCible.height / 2), colorFX); 
        if(cibleCardNode) cibleCardNode.classList.add('shake-card'); setTimeout(() => { if(cibleCardNode) cibleCardNode.classList.remove('shake-card'); }, 400); 
        finaliserTour(logTexte, contreAttaqueReussie);
    }, 750);
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

function recommencerNouvellePartie() {
    if(rewardModalInst) rewardModalInst.hide(); 
    selectedTeamIds = [];
    const startBtn = document.getElementById('startMatchBtn'); if(startBtn) { startBtn.innerText = "LANCER LE COMBAT (0/3)"; startBtn.disabled = true; }
    document.getElementById('selectionGrid').innerHTML = "";
    chargerCartesDuJoueur(); retourLobby();
}

function getCardImgUrl(cardId) {
    if (!cardId) return "https://images.pokemontcg.io/swsh8/1_hires.png";
    let found = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === cardId.toString());
    if (found && (found.Image_URL || found.Image)) {
        return found.Image_URL || found.Image;
    }
    let idStr = cardId.toString().toLowerCase();
    if (idStr.startsWith('swsh8-')) {
        let num = idStr.replace('swsh8-', '');
        return `https://images.pokemontcg.io/swsh8/${num}_hires.png`;
    } 
    if (!isNaN(idStr)) {
        return `https://images.pokemontcg.io/swsh8/${idStr}_hires.png`;
    }
    if (idStr.startsWith('swsh8')) {
        let num = idStr.replace('swsh8', '');
        return `https://images.pokemontcg.io/swsh8/${num}_hires.png`;
    }
    return `https://images.pokemontcg.io/swsh8/1_hires.png`;
}
