// ==========================================
// COMBATHORSLIGNE.JS : MOTEUR ET GENERATION
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbzKgKRkfVyQuNCrc0T13iH1orPFeWIZAK4kB_emnRFimN-ae_HzISIqUzZ_g1aWgPwHjg/exec";
let currentUser = null, currentUserPref = "Tous", listeMembres = [];
let selectedTeamIds = [], myCollection = [];
let rewardModalInst = null, isCardsLoaded = false, cardsToUpgradeQueue = [];
let serveurSauvegardeTerminee = false;

let localMatch = {};

window.addEventListener('DOMContentLoaded', () => {
    rewardModalInst = new bootstrap.Modal(document.getElementById('rewardModal'));
    const s1 = document.getElementById('usernameSelect');
    s1.innerHTML = '<option value="">Connexion au serveur...</option>';
    
    fetch(`${API_URL}?action=getMembres`).then(res => res.json()).then(membres => {
        listeMembres = membres || [];
        s1.innerHTML = '<option value="">-- Qui es-tu ? --</option>';
        listeMembres.filter(m => m && m.Nom !== 'Admin').forEach(m => {
            s1.innerHTML += `<option value="${m.Nom}">${m.Nom}</option>`;
        });

        // 1. DÉTECTION ET AUTO-CONNEXION VIA LE LOCALSTORAGE
        const savedUser = localStorage.getItem('brawlUser');
        if (savedUser) {
            currentUser = savedUser;
            let mFound = listeMembres.find(m => m && m.Nom === currentUser);
            currentUserPref = mFound ? (mFound.Type_Recompense || mFound.Preference_Cartes || "les_deux") : "les_deux";

            document.getElementById('loginPage').classList.add('d-none'); 
            document.getElementById('headerBar').classList.remove('d-none');
            document.getElementById('lobbyPhase').classList.remove('d-none');
            document.getElementById('displayUsername').innerText = currentUser.toUpperCase();
            chargerCartesDuJoueur();
        }
    });
});

function handleLogin() {
    currentUser = document.getElementById('usernameSelect').value; if(!currentUser) return;
    
    // Enregistre l'utilisateur en mémoire
    localStorage.setItem('brawlUser', currentUser);

    let mFound = listeMembres.find(m => m && m.Nom === currentUser);
    currentUserPref = mFound ? (mFound.Type_Recompense || mFound.Preference_Cartes || "les_deux") : "les_deux";

    document.getElementById('loginPage').classList.add('d-none'); 
    document.getElementById('headerBar').classList.remove('d-none');
    document.getElementById('lobbyPhase').classList.remove('d-none');
    document.getElementById('displayUsername').innerText = currentUser.toUpperCase();
    chargerCartesDuJoueur();
}

// 2. FONCTION DE DÉCONNEXION MANUELLE
function handleLogout() {
    localStorage.removeItem('brawlUser');
    localStorage.removeItem('brawlRole');
    window.location.href = "https://tommyaudetcontact-wq.github.io/brawlTasks2.0/";
}

function chargerCartesDuJoueur() {
    const botBtn = document.querySelector("#lobbyPhase button");
    botBtn.disabled = true; botBtn.innerText = "CHARGEMENT... ⏳";
    fetch(`${API_URL}?action=getCollection`).then(res => res.json()).then(cards => {
        myCollection = cards.filter(c => (c.Nom_Joueur || "").toLowerCase() === currentUser.toLowerCase());
        isCardsLoaded = true; botBtn.disabled = false; botBtn.innerText = "DÉFIER LE BOT 🤖";
    });
}

function retourLobby() {
    document.body.classList.remove('in-battle');
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

function renderGrid() {
    const container = document.getElementById('selectionGrid'); container.innerHTML = "";
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
    document.getElementById('startMatchBtn').innerText = `LANCER LE COMBAT (${selectedTeamIds.length} / 3)`;
    document.getElementById('startMatchBtn').disabled = selectedTeamIds.length !== 3;
}

function validerMonDeck() {
    genererStructureMatchDonnees();
    PouvoirManager.declencherTirageSlotMachine(() => {
        document.body.classList.add('in-battle');
        document.getElementById('nonBattleInterface').classList.add('d-none');
        document.getElementById('battlePhase').classList.remove('d-none');
        document.getElementById('battleEnemyName').innerText = "ROBOT-BOT 🤖";
        document.getElementById('battlePlayerName').innerText = currentUser.toUpperCase();
        synchroniserVisuelsLocaux();
    });
}

function genererStructureMatchDonnees() {
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

        let roll = Math.floor(Math.random() * 3) - 1; 
        let botLvl = myLvl + roll; if(botLvl < 1) botLvl = 1; 
        botLvlsDeck.push(botLvl);

        let botPvBonus = 0; let botAtqBonus = 0;
        let levelsToDistribute = botLvl - 1;
        for(let l=0; l < levelsToDistribute; l++) {
            if(Math.random() < 0.5) botPvBonus += 5; else botAtqBonus += 1;
        }
        hpCalculatedDeckJ2.push(25 + botPvBonus);
        botAtqBonusDeck.push(botAtqBonus);
    });

    localMatch = {
        statut: "actif", 
        hpJ1: hpCalculatedDeckJ1[0], maxHpDeckJ1: [...hpCalculatedDeckJ1], currentHpDeckJ1: [...hpCalculatedDeckJ1],
        hpJ2: hpCalculatedDeckJ2[0], maxHpDeckJ2: [...hpCalculatedDeckJ2], currentHpDeckJ2: [...hpCalculatedDeckJ2],
        botAtqBonusDeck: botAtqBonusDeck, botLvlsDeck: botLvlsDeck,
        indexJ1: 0, indexJ2: 0, deckJ1: [...selectedTeamIds], deckJ2: botDeck,
        tourA: "J1", dernierCoup: "Le combat commence !", esquiveJ1Active: false, esquiveJ2Active: false,
        botAAssayeEsquive: false
    };
}

function rejouerMemeDeck() {
    rewardModalInst.hide();
    validerMonDeck();
}

function recommencerNouvellePartie() {
    document.body.classList.remove('in-battle');
    if (rewardModalInst) rewardModalInst.hide();
    selectedTeamIds = [];
    const startBtn = document.getElementById('startMatchBtn');
    if (startBtn) {
        startBtn.innerText = "LANCER LE COMBAT (0/3)";
        startBtn.disabled = true;
    }
    document.getElementById('selectionGrid').innerHTML = "";
    document.getElementById('battlePhase').classList.add('d-none');
    document.getElementById('setupPhase').classList.add('d-none');
    document.getElementById('nonBattleInterface').classList.remove('d-none');
    document.getElementById('lobbyPhase').classList.remove('d-none');
    chargerCartesDuJoueur();
}

function activerPouvoirManuel() {
    PouvoirManager.activerPouvoirManuel();
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
    
    anchor.className = "pokemon-card-wrapper";
    
    if (foundCard) {
        levelTextNode.innerText = "NIVEAU " + (foundCard.Carte_Niveau || 1);
        let nrg = (foundCard.Energie !== undefined) ? parseInt(foundCard.Energie) : 100;
        let cln = (foundCard.Proprete !== undefined) ? parseInt(foundCard.Proprete) : 100;
        if(nrg < 30 || cln < 30) {
            anchor.classList.add('wrapper-mauvais');
            statusTextNode.innerHTML = "<span style='color:var(--brawl-pink);'>ÉTAT : MAUVAIS ⚠️</span>";
        } else if(nrg < 60 || cln < 60) {
            anchor.classList.add('wrapper-moyen');
            statusTextNode.innerHTML = "<span style='color:var(--brawl-yellow);'>ÉTAT : MOYEN ⏳</span>";
        } else {
            statusTextNode.innerHTML = "<span style='color:var(--brawl-green);'>ÉTAT : EXCELLENT 🟢</span>";
        }
    } else { levelTextNode.innerText = "NIVEAU 1"; }

    enemyLevelTextNode.innerText = "NIVEAU " + localMatch.botLvlsDeck[sonIndexVis];

    let pBonus = foundCard ? (parseInt(foundCard.Attaque_Bonus) || 0) : 0;
    let pNrg = foundCard ? parseInt(foundCard.Energie || 100) : 100;
    let pCln = foundCard ? parseInt(foundCard.Proprete || 100) : 100;
    let pMinDmg = 10 + pBonus; let pMaxDmg = 21 + pBonus;
    if (pNrg < 30 || pCln < 30) { pMinDmg = Math.round(pMinDmg * 0.66); pMaxDmg = Math.round(pMaxDmg * 0.66); }
    pMinDmg = PouvoirManager.ajusterDegats(pMinDmg, true);
    pMaxDmg = PouvoirManager.ajusterDegats(pMaxDmg, true);
    document.getElementById('playerAtqText').innerText = `⚔️ ATTAQUE : ${pMinDmg} - ${pMaxDmg}`;

    let bBonus = localMatch.botAtqBonusDeck[sonIndexVis] || 0;
    let bMinDmg = PouvoirManager.ajusterDegats(10 + bBonus, false);
    let bMaxDmg = PouvoirManager.ajusterDegats(21 + bBonus, false);
    document.getElementById('enemyAtqText').innerText = `⚔️ ATTAQUE : ${bMinDmg} - ${bMaxDmg}`;

    // BADGE DU BOT EN HAUT À GAUCHE
    const topBadge = document.getElementById('enemyPouvoirTopBadge');
    if(topBadge && localMatch.pouvoirJ2) {
        let st = localMatch.pouvoirJ2Utilise ? "UTILISÉ ✖️" : "PRÊT 🌟";
        topBadge.innerText = `BOT : ${localMatch.pouvoirJ2.nom.toUpperCase()} [${st}]`;
    }

    // MODAL D'INFORMATION COMPLET (i)
    const pBadge = document.getElementById('pouvoirBadge');
    if(localMatch.pouvoirJ1) {
        let stJ1 = localMatch.pouvoirJ1Utilise ? 'UTILISÉ ✖️' : 'DISPONIBLE 🌟';
        pBadge.innerText = `TON POUVOIR : ${localMatch.pouvoirJ1.nom.toUpperCase()} (${stJ1})\n\n${localMatch.pouvoirJ1.desc}`;
    }
    const eBadge = document.getElementById('enemyPouvoirBadge');
    if(localMatch.pouvoirJ2) {
        let stJ2 = localMatch.pouvoirJ2Utilise ? 'UTILISÉ ✖️' : 'DISPONIBLE 🌟';
        eBadge.innerText = `POUVOIR DU BOT : ${localMatch.pouvoirJ2.nom.toUpperCase()} (${stJ2})\n\n${localMatch.pouvoirJ2.desc}`;
    }

    const btnPouvoir = document.getElementById('btnPouvoirSpecial');
    if(localMatch.pouvoirJ1) {
        btnPouvoir.classList.remove('d-none');
        let estBloque = localMatch.toursPouvoirBloqueJoueur > 0;
        btnPouvoir.disabled = !isMoi || localMatch.pouvoirJ1Utilise || localMatch.statut !== "actif" || estBloque;
        
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

    animerBandeauTour(localMatch.tourA);

    document.getElementById('playerFighterImg').src = getCardImgUrl(localMatch.deckJ1[monIndexVis]);
    document.getElementById('enemyFighterImg').src = getCardImgUrl(localMatch.deckJ2[sonIndexVis]);

    let monPvAffiche = localMatch.indexJ1 >= 3 ? 0 : localMatch.hpJ1;
    let sonPvAffiche = localMatch.indexJ2 >= 3 ? 0 : localMatch.hpJ2;
    let monPvMaxAffiche = localMatch.indexJ1 >= 3 ? 25 : localMatch.maxHpDeckJ1[monIndexVis];
    let sonPvMaxAffiche = localMatch.indexJ2 >= 3 ? 25 : localMatch.maxHpDeckJ2[sonIndexVis];

    document.getElementById('playerHpBar').style.width = (monPvAffiche / monPvMaxAffiche * 100) + "%"; 
    document.getElementById('playerHpText').innerText = `${monPvAffiche} / ${monPvMaxAffiche} PV`;
    document.getElementById('enemyHpBar').style.width = (sonPvAffiche / sonPvMaxAffiche * 100) + "%"; 
    document.getElementById('enemyHpText').innerText = `${sonPvAffiche} / ${sonPvMaxAffiche} PV`;

    document.getElementById('btnAttaque').disabled = !isMoi;
    document.getElementById('btnEsquive').disabled = !isMoi;

    const pMini = document.getElementById('playerMiniDeck'); pMini.innerHTML = "";
    localMatch.deckJ1.forEach((idCard, i) => {
        let statusClass = (i === localMatch.indexJ1) ? 'active-mini' : (localMatch.currentHpDeckJ1[i] <= 0 ? 'ko-mini' : '');
        pMini.innerHTML += `<img src="${getCardImgUrl(idCard)}" class="mini-card ${statusClass}">`;
    });

    const eMini = document.getElementById('enemyMiniDeck'); eMini.innerHTML = "";
    localMatch.deckJ2.forEach((idCard, i) => {
        let statusClass = (i === localMatch.indexJ2) ? 'active-mini' : (localMatch.currentHpDeckJ2[i] <= 0 ? 'ko-mini' : '');
        eMini.innerHTML += `<img src="${getCardImgUrl(idCard)}" class="mini-card ${statusClass}">`;
    });

    if (localMatch.tourA === "J2" && localMatch.statut === "actif") setTimeout(decisionBot, 1500);
}

function animerBandeauTour(tourActuel) {
    const bannerContainer = document.getElementById('brawlTurnBanner');
    const bannerText = document.getElementById('brawlBannerText');
    bannerContainer.style.display = 'none'; void bannerContainer.offsetWidth; bannerContainer.style.display = 'block';
    if (tourActuel === "J1") {
        bannerText.innerText = "À TON TOUR ! 🔥"; bannerText.className = "brawl-banner-text banner-moi";
    } else {
        bannerText.innerText = `TOUR DU BOT 🤖`; bannerText.className = "brawl-banner-text banner-adversaire";
    }
    setTimeout(() => { bannerContainer.style.display = 'none'; }, 1600);
}

function preparerAttaque() {
    let monIndexVis = localMatch.indexJ1 >= 3 ? 2 : localMatch.indexJ1;
    let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === localMatch.deckJ1[monIndexVis].toString());
    let atqBonus = foundCard ? (parseInt(foundCard.Attaque_Bonus) || 0) : 0;
    let nrg = (foundCard && foundCard.Energie !== undefined) ? parseInt(foundCard.Energie) : 100;
    let cln = (foundCard && foundCard.Proprete !== undefined) ? parseInt(foundCard.Proprete) : 100;
    let dmg = Math.floor(Math.random() * 12) + 10 + atqBonus;
    if (nrg < 30 || cln < 30) dmg = Math.round(dmg * 0.66);
    dmg = PouvoirManager.ajusterDegats(dmg, true);
    jouerCoupLocal('attaque', dmg, ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)]);
}

function decisionBot() {
    PouvoirManager.analyserEtExecuterPouvoirBot();
    if(localMatch.statut !== "actif") return; 

    let sonIndexVis = localMatch.indexJ2 >= 3 ? 2 : localMatch.indexJ2;
    if (localMatch.indexJ2 === 2 && localMatch.hpJ2 <= 12 && !localMatch.botAAssayeEsquive) {
        localMatch.botAAssayeEsquive = true; 
        jouerCoupLocal('esquive');
    } else {
        let botAtqBonus = localMatch.botAtqBonusDeck[sonIndexVis];
        let dmg = Math.floor(Math.random() * 12) + 10 + botAtqBonus;
        dmg = PouvoirManager.ajusterDegats(dmg, false);
        jouerCoupLocal('attaque', dmg, ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)]);
    }
}

function jouerCoupLocal(type, dmg = 0, element = "") {
    document.getElementById('btnAttaque').disabled = true; document.getElementById('btnEsquive').disabled = true;
    let logCoup = ""; let animDepuisMoi = (localMatch.tourA === "J1");
    let contreAttaqueReussie = false;

    if (type === 'attaque') {
        let esquiveActive = animDepuisMoi ? localMatch.esquiveJ2Active : localMatch.esquiveJ1Active;
        localMatch.esquiveJ1Active = false; localMatch.esquiveJ2Active = false;

        if (esquiveActive) {
            contreAttaqueReussie = true;
            logCoup = `L'esquive était active ! CONTRE-ATTAQUE ! ${animDepuisMoi ? "Le Bot" : currentUser} subit ${dmg} dégâts ! ⚡`;
            executerImpactFin(animDepuisMoi, dmg);
        } else {
            logCoup = `${animDepuisMoi ? currentUser : "Le Bot"} lance une attaque [${element.toUpperCase()}] : ${dmg} dégâts !`;
            executerImpactFin(!animDepuisMoi, dmg);
        }
        lancerAnimationFX(animDepuisMoi, element, esquiveActive, logCoup, contreAttaqueReussie);
    } else {
        let chance = PouvoirManager.obtenirChanceEsquive(animDepuisMoi);
        let reussiteEsquive = (Math.random() < chance);
        
        if (animDepuisMoi) {
            localMatch.esquiveJ1Active = reussiteEsquive;
            if (reussiteEsquive && localMatch.toursVifDorJ1 > 0) {
                finaliserTour("⚡ VIF D'OR RÉUSSI ! Tu gardes la main et peux attaquer immédiatement !", true);
                return;
            } else if (!reussiteEsquive && localMatch.toursVifDorJ1 > 0) {
                localMatch.skipNextTurnJ1 = true;
                finaliserTour("⚡ VIF D'OR ÉCHOUÉ ! Tu passeras ton prochain tour !", false);
                return;
            }
        } else {
            localMatch.esquiveJ2Active = reussiteEsquive;
        }

        finaliserTour(`${animDepuisMoi ? currentUser : "Le Bot"} tente une esquive tactique ! 🛡️`, false);
    }
}

function executerImpactFin(cibleEstJoueur, degats) {
    if (cibleEstJoueur) {
        let estMort = PouvoirManager.gererEncaisserDegatsJ1(degats);
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
        let estMort = PouvoirManager.gererEncaisserDegatsJ2(degats);
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
    document.getElementById('combatLog').innerText = logTexte;
    PouvoirManager.decrementerTours();

    if (localMatch.indexJ1 >= 3 || localMatch.indexJ2 >= 3) {
        localMatch.statut = "termine";
        declencherFinDeMatch();
        return;
    }

    if (localMatch.rafaleEnCoursJ1) {
        localMatch.rafaleEnCoursJ1 = false;
        setTimeout(() => {
            document.getElementById('combatLog').innerText = "💥 POUVOIR EN RAFALE : Deuxième frappe consécutive !";
            preparerAttaque();
        }, 700);
        return;
    }

    if (localMatch.rafaleEnCoursJ2) {
        localMatch.rafaleEnCoursJ2 = false;
        setTimeout(() => {
            document.getElementById('combatLog').innerText = "🤖 POUVOIR EN RAFALE : Le Bot réattaque immédiatement !";
            let sonIndexVis = localMatch.indexJ2 >= 3 ? 2 : localMatch.indexJ2;
            let botAtqBonus = localMatch.botAtqBonusDeck[sonIndexVis];
            let dmg = Math.floor(Math.random() * 12) + 10 + botAtqBonus;
            dmg = PouvoirManager.ajusterDegats(dmg, false);
            jouerCoupLocal('attaque', dmg, ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)]);
        }, 700);
        return;
    }

    if (!etaitUnContre) {
        if (localMatch.tourA === "J1") {
            // Le joueur 1 vient de terminer son tour
            if (localMatch.skipNextTurnJ2) {
                // Le Bot devait passer son tour -> J1 rejoue immédiatement !
                localMatch.skipNextTurnJ2 = false;
                localMatch.tourA = "J1";
                document.getElementById('combatLog').innerText += " (Le tour du Bot est sauté !)";
            } else {
                localMatch.tourA = "J2";
            }
        } else if (localMatch.tourA === "J2") {
            // Le Bot vient de terminer son tour
            if (localMatch.skipNextTurnJ1) {
                // Le joueur 1 doit passer son tour -> Le Bot rejoue immédiatement !
                localMatch.skipNextTurnJ1 = false;
                localMatch.tourA = "J2";
                document.getElementById('combatLog').innerText += " (Ton tour est sauté !)";
            } else {
                localMatch.tourA = "J1";
            }
        }
    }
    synchroniserVisuelsLocaux();
}

function declencherFinDeMatch() {
    let vainqueurEstJoueur = (localMatch.indexJ2 >= 3);
    document.getElementById('rewardTitle').innerText = vainqueurEstJoueur ? "🏆 VICTOIRE !" : "💀 DÉFAITE !";
    document.getElementById('rewardXpText').innerText = vainqueurEstJoueur ? "+10 XP pour ton niveau personnel !" : "+0 XP";
    
    document.body.classList.remove('in-battle');
    const summaryBox = document.getElementById('cardsXpSummary'); summaryBox.innerHTML = "";
    cardsToUpgradeQueue = []; serveurSauvegardeTerminee = false; 
    document.getElementById('btnLobbyQuit').disabled = true;
    document.getElementById('btnRematchSameDeck').disabled = true;
    
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

            summaryBox.innerHTML += `
                <div class="mb-2">
                    <div class="d-flex justify-content-between small fw-bold"><span>${(c.Nom_Pokemon || "CARTE").toUpperCase()}</span><span class="text-info">XP ${oldXp} ➔ ${targetXp}/100</span></div>
                    <div class="modal-xp-container"><div id="modalBarIdx_${keyIdx}" class="modal-xp-bar"></div><div class="modal-xp-text">${lvlUpDetecte ? '⭐ LEVEL UP !':'PROGRESSION'}</div></div>
                    <div class="text-muted" style="font-size:0.72rem;">Fatigue post-match : Énergie: ${nextNrg}% | Propreté: ${nextCln}%</div>
                </div>`;
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
        if(data && data.levelUp) {
            if (data.newLevel) {
                localStorage.setItem('lastKnownLevel_' + currentUser, data.newLevel);
            }

            if (data.nouvelleCarte || data.carteObject || data.carte) {
                let cardObj = data.carteObject || data.carte || {};
                let cardId = data.nouvelleCarte || cardObj.Pokemon_API_ID || cardObj.Card_API_ID;
                let imgUrl = data.Image_URL || cardObj.Image_URL || data.image || getCardImgUrl(cardId);
                let cardName = data.nom || cardObj.Nom_Pokemon || cardObj.Nom || "Nouvelle Carte";

                document.getElementById('rewardCardImg').src = imgUrl;
                document.getElementById('levelUpSection').classList.remove('d-none');

                let exists = myCollection.some(c => (c.Pokemon_API_ID || "").toString() === (cardId || "").toString());
                if (!exists && cardId) {
                    let newCard = {
                        Nom_Joueur: currentUser,
                        Pokemon_API_ID: cardId,
                        Nom_Pokemon: cardName,
                        Image_URL: imgUrl,
                        Carte_Niveau: 1,
                        Carte_XP: 0,
                        PV_Bonus: 0,
                        Attaque_Bonus: 0,
                        Energie: 100,
                        Proprete: 100
                    };
                    myCollection.push(newCard);
                }
            }
        } else { document.getElementById('levelUpSection').classList.add('d-none'); }
        return fetch(`${API_URL}?action=nettoyerMatchFin&username=${encodeURIComponent(currentUser)}&deck=${deckString}&malus=${malusEntretien}`);
    })
    .then(() => { serveurSauvegardeTerminee = true; verifierQueueUpgrades(); });
    rewardModalInst.show();
}

function verifierQueueUpgrades() {
    if(cardsToUpgradeQueue.length > 0) {
        document.getElementById('btnLobbyQuit').disabled = true;
        document.getElementById('btnRematchSameDeck').disabled = true;
        let nextUpgrade = cardsToUpgradeQueue[0];
        document.getElementById('lvlUpCardNameTxt').innerText = `Félicitations ! Améliore ${nextUpgrade.cardName.toUpperCase()} vers le Niveau ${nextUpgrade.nextLvl} :`;
        document.getElementById('lvlUpCardPreviewImg').src = getCardImgUrl(nextUpgrade.cardId);
        document.getElementById('cardLevelUpChoiceBlock').classList.remove('d-none');
    } else {
        document.getElementById('cardLevelUpChoiceBlock').classList.add('d-none');
        if(serveurSauvegardeTerminee) {
            document.getElementById('btnLobbyQuit').disabled = false;
            document.getElementById('btnLobbyQuit').innerText = "CHOISIR D'AUTRES CARTES 🕹️";
            document.getElementById('btnRematchSameDeck').disabled = false;
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
        cibleCardNode.classList.add('shake-card'); setTimeout(() => { cibleCardNode.classList.remove('shake-card'); }, 400); 
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

function getCardImgUrl(cardId) {
    if (!cardId) return "https://placehold.co/280x390/151824/8b5cf6?text=Image+Non+Disponible";
    let found = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === cardId.toString());
    if (found && (found.Image_URL || found.Image)) return found.Image_URL || found.Image;
    
    let cardStr = cardId.toString();
    if (cardStr.startsWith('http://') || cardStr.startsWith('https://')) {
        return cardStr;
    }
    if (cardStr.startsWith('swsh8-')) {
        return `https://images.pokemontcg.io/swsh8/${cardStr.replace('swsh8-', '')}_hires.png`;
    }
    if (!isNaN(cardStr)) {
        return `https://images.pokemontcg.io/swsh8/${cardStr}_hires.png`;
    }
    return "https://placehold.co/280x390/151824/8b5cf6?text=Image+Non+Disponible";
}
