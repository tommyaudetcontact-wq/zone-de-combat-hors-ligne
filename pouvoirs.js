/**
 * pouvoirs.js - Module de gestion des Compétences de Combat (Joueur & Bot)
 */

const LISTE_POUVOIRS = {
    second_souffle: { nom: "Second Souffle 🫁", desc: "Boost instantané : +25% PV et +25% Attaque sur la carte actuelle." },
    sans_issue: { nom: "Sans Issue 🕸️", desc: "Passif : Bloque TOTALEMENT l'esquive pour les deux joueurs pendant tout le match." },
    vif_papillon: { nom: "Vif comme le Papillon 🦋", desc: "La prochaine esquive passe à 75% de chances de réussir." },
    pansement: { nom: "Pansement 🩹", desc: "Soigne instantanément 50% des PV max de la carte active." },
    reanimation: { nom: "Réanimation 🧪", desc: "Fait revivre la dernière carte KO avec 66% de sa santé en mauvais état." },
    peau_rock: { nom: "Peau de Rock 🪨", desc: "Cette carte active encaisse 50% de dégâts en moins (s'arrête si elle meurt)." },
    vengeance: { nom: "Vengeance 💀", desc: "Si ta carte meurt, la carte tueuse adverse perd la moitié de ses PV et 25% de son Attaque." },
    switch_card: { nom: "Switch 🔄", desc: "Échange instantanément ta carte active actuelle avec celle de l'adversaire !" },
    rafale_temporelle: { nom: "Rafale Temporelle ⏳", desc: "Lance 2 attaques de suite instantanément, mais saute tes 2 prochains tours." }
};

let pouvoirSelectionne = null;
let pouvoirUtilise = false;
let botPouvoir = null;
let botPouvoirUtilise = false;

function lancerAnimationSlotMachine() {
    pouvoirUtilise = false;
    pouvoirSelectionne = null;
    botPouvoirUtilise = false;

    const slotText = document.getElementById('slotMachineText');
    const slotDesc = document.getElementById('slotMachineDesc');
    const btnFermer = document.getElementById('btnFermerSlot');
    
    if(btnFermer) btnFermer.disabled = true;
    if(slotDesc) slotDesc.innerText = "Sélection des bonus de combat...";

    const cles = Object.keys(LISTE_POUVOIRS);
    let delay = 25;

    function rouler() {
        let cleAuHasard = cles[Math.floor(Math.random() * cles.length)];
        if(slotText) slotText.innerText = LISTE_POUVOIRS[cleAuHasard].nom;
        delay *= 1.15;

        if (delay < 500) {
            setTimeout(rouler, delay);
        } else {
            pouvoirSelectionne = cles[Math.floor(Math.random() * cles.length)];
            if(slotText) {
                slotText.innerText = LISTE_POUVOIRS[pouvoirSelectionne].nom;
                slotText.classList.add('animate__animated', 'animate__bounceIn');
            }
            if(slotDesc) slotDesc.innerText = LISTE_POUVOIRS[pouvoirSelectionne].desc;
            
            botPouvoir = cles[Math.floor(Math.random() * cles.length)];

            if(btnFermer) {
                btnFermer.disabled = false;
                btnFermer.innerText = "ENTRER DANS L'ARÈNE ⚔️";
            }
            
            initBoutonsPouvoirsMatch();

            if (typeof triggerBrawlNotification === 'function') {
                triggerBrawlNotification(`POUVOIR : ${LISTE_POUVOIRS[pouvoirSelectionne].nom.split(' ')[0]} ACCORDÉ ! ⚡`, "banner-moi");
            }
        }
    }
    if(slotText) slotText.classList.remove('animate__animated', 'animate__bounceIn');
    rouler();
}

function initBoutonsPouvoirsMatch() {
    const btnJ = document.getElementById('btnPouvoirSpecial');
    if (btnJ && pouvoirSelectionne) {
        btnJ.disabled = (pouvoirSelectionne === 'sans_issue');
        btnJ.innerText = LISTE_POUVOIRS[pouvoirSelectionne].nom.split(' ')[0] + " ⚡";
        btnJ.title = `${LISTE_POUVOIRS[pouvoirSelectionne].nom} : ${LISTE_POUVOIRS[pouvoirSelectionne].desc}`;
        if(pouvoirSelectionne === 'sans_issue') btnJ.innerText = "SANS ISSUE 🕸️";
    }

    const badgeBot = document.getElementById('enemyPouvoirBadge');
    if (badgeBot && botPouvoir) {
        badgeBot.innerText = "🤖 " + LISTE_POUVOIRS[botPouvoir].nom.split(' ')[0];
        badgeBot.title = `POUVOIR DU BOT : ${LISTE_POUVOIRS[botPouvoir].desc}`;
    }
}

function activerPouvoirEnCombat() {
    if (pouvoirUtilise || !pouvoirSelectionne) return;
    let monIndex = localMatch.indexJ1;
    let sonIndex = localMatch.indexJ2;
    let logMsg = "";

    if (pouvoirSelectionne === 'rafale_temporelle') {
        pouvoirUtilise = true;
        document.getElementById('btnPouvoirSpecial').disabled = true;
        document.getElementById('btnPouvoirSpecial').innerText = "UTILISÉ 🛑";
        
        if (typeof triggerBrawlNotification === 'function') triggerBrawlNotification("RAFALE TEMPORELLE ! ⏳", "banner-moi");
        document.getElementById('combatLog').innerText = "⏳ RAFALE ! Lancement du premier coup dévastateur !";
        
        localMatch.rafaleEnCours = true;
        localMatch.toursASkipJ1 = 2;

        preparerAttaque();
        
        setTimeout(() => {
            if (localMatch.statut === "actif") {
                document.getElementById('combatLog').innerText = "⏳ RAFALE ! Lancement du second coup consécutif !";
                localMatch.rafaleEnCours = false;
                preparerAttaque();
            }
        }, 1000);
        return;
    }

    switch (pouvoirSelectionne) {
        case 'second_souffle':
            localMatch.hpJ1 = Math.round(localMatch.hpJ1 * 1.25);
            localMatch.maxHpDeckJ1[monIndex] = Math.round(localMatch.maxHpDeckJ1[monIndex] * 1.25);
            localMatch.secondSouffleActif = true;
            logMsg = `🔥 TU ACTIVES : ${LISTE_POUVOIRS.second_souffle.nom} !`;
            break;
        case 'pansement':
            let pvMax = localMatch.maxHpDeckJ1[monIndex];
            localMatch.hpJ1 = Math.min(pvMax, localMatch.hpJ1 + Math.round(pvMax * 0.50));
            logMsg = `🩹 TU ACTIVES : ${LISTE_POUVOIRS.pansement.nom} !`;
            break;
        case 'vif_papillon':
            localMatch.boostEsquivePapillon = true;
            logMsg = `🦋 TU ACTIVES : ${LISTE_POUVOIRS.vif_papillon.nom} !`;
            break;
        case 'peau_rock':
            localMatch.idCartePeauDeRock = localMatch.deckJ1[monIndex];
            logMsg = `🪨 TU ACTIVES : ${LISTE_POUVOIRS.peau_rock.nom} !`;
            break;
        case 'vengeance':
            localMatch.vengeanceActiveJoueur = true;
            logMsg = `💀 TU ACTIVES : ${LISTE_POUVOIRS.vengeance.nom} !`;
            break;
        case 'switch_card':
            let tempDeck = localMatch.deckJ1[monIndex]; localMatch.deckJ1[monIndex] = localMatch.deckJ2[sonIndex]; localMatch.deckJ2[sonIndex] = tempDeck;
            let tempHp = localMatch.hpJ1; localMatch.hpJ1 = localMatch.hpJ2; localMatch.hpJ2 = tempHp;
            let tempMax = localMatch.maxHpDeckJ1[monIndex]; localMatch.maxHpDeckJ1[monIndex] = localMatch.maxHpDeckJ2[sonIndex]; localMatch.maxHpDeckJ2[sonIndex] = tempMax;
            logMsg = `🔄 POUVOIR SWITCH ! Échange de cartes effectué !`;
            break;
        case 'reanimation':
            if (localMatch.indexJ1 > 0) {
                localMatch.indexJ1 -= 1; localMatch.maxHpDeckJ1[localMatch.indexJ1] = Math.round(25 * 0.66); localMatch.hpJ1 = localMatch.maxHpDeckJ1[localMatch.indexJ1];
                logMsg = `🧪 TU ACTIVES : ${LISTE_POUVOIRS.reanimation.nom} !`;
            } else { alert("Aucun Pokémon n'est K.O. !"); return; }
            break;
    }

    pouvoirUtilise = true;
    document.getElementById('btnPouvoirSpecial').disabled = true;
    document.getElementById('btnPouvoirSpecial').innerText = "UTILISÉ 🛑";
    document.getElementById('combatLog').innerText = logMsg;
    if (typeof triggerBrawlNotification === 'function') triggerBrawlNotification("POUVOIR ACTIVÉ ! ✨", "banner-moi");
    if (typeof synchroniserVisuelsLocaux === 'function') synchroniserVisuelsLocaux();
}

function evaluerPouvoirBot() {
    if (botPouvoirUtilise || !botPouvoir || botPouvoir === 'sans_issue') return false;

    let sonIndex = localMatch.indexJ2;
    let monIndex = localMatch.indexJ1;
    let sesPvMax = localMatch.maxHpDeckJ2[sonIndex];

    if (botPouvoir === 'rafale_temporelle') {
        if (localMatch.hpJ1 <= 22 || (localMatch.indexJ2 === 0 && localMatch.hpJ2 >= sesPvMax * 0.90)) {
            botPouvoirUtilise = true;
            document.getElementById('enemyPouvoirBadge').innerText = "UTILISÉ 🛑";
            
            if (typeof triggerBrawlNotification === 'function') triggerBrawlNotification("RAFALE TEMPORELLE ENNEMIE ! ⏳", "banner-adversaire");
            
            localMatch.rafaleEnCours = true;
            localMatch.toursASkipJ2 = 2;
            
            let botAtqBonus = localMatch.botAtqBonusDeck[sonIndex];
            
            let dmg1 = Math.floor(Math.random() * 12) + 10 + botAtqBonus;
            if (localMatch.botSecondSouffleActif) dmg1 = Math.round(dmg1 * 1.25);
            jouerCoupLocal('attaque', dmg1, ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)]);

            setTimeout(() => {
                if (localMatch.statut === "actif") {
                    localMatch.rafaleEnCours = false;
                    let dmg2 = Math.floor(Math.random() * 12) + 10 + botAtqBonus;
                    if (localMatch.botSecondSouffleActif) dmg2 = Math.round(dmg2 * 1.25);
                    jouerCoupLocal('attaque', dmg2, ['feu', 'eau', 'eclair', 'feuille'][Math.floor(Math.random() * 4)]);
                }
            }, 1000);
            return true;
        }
        return false;
    }

    let declencher = false; let logMsg = "";
    switch (botPouvoir) {
        case 'second_souffle':
            if (localMatch.hpJ2 <= sesPvMax * 0.65) {
                localMatch.hpJ2 = Math.round(localMatch.hpJ2 * 1.25); localMatch.maxHpDeckJ2[sonIndex] = Math.round(sesPvMax * 1.25);
                localMatch.botSecondSouffleActif = true; logMsg = `🤖 LE BOT ACTIVE : ${LISTE_POUVOIRS.second_souffle.nom} !`; declencher = true;
            }
            break;
        case 'pansement':
            if (localMatch.hpJ2 <= sesPvMax * 0.40) {
                localMatch.hpJ2 = Math.min(sesPvMax, localMatch.hpJ2 + Math.round(sesPvMax * 0.50));
                logMsg = `🤖 LE BOT ACTIVE : ${LISTE_POUVOIRS.pansement.nom} !`; declencher = true;
            }
            break;
        case 'vif_papillon':
            if (localMatch.indexJ2 === 2 && localMatch.hpJ2 <= 12) {
                localMatch.botBoostEsquivePapillon = true; logMsg = `🤖 LE BOT ACTIVE : ${LISTE_POUVOIRS.vif_papillon.nom} !`; declencher = true;
            }
            break;
        case 'peau_rock':
            if (localMatch.hpJ2 >= sesPvMax * 0.80) {
                localMatch.idCarteBotPeauDeRock = localMatch.deckJ2[sonIndex]; logMsg = `🤖 LE BOT ACTIVE : ${LISTE_POUVOIRS.peau_rock.nom} !`; declencher = true;
            }
            break;
        case 'vengeance':
            if (localMatch.hpJ2 <= 10) {
                localMatch.vengeanceActiveBot = true; logMsg = `🤖 LE BOT ACTIVE : ${LISTE_POUVOIRS.vengeance.nom} !`; declencher = true;
            }
            break;
        case 'switch_card':
            if (localMatch.hpJ2 <= 8 && localMatch.hpJ1 >= 18) {
                let tempDeck = localMatch.deckJ1[monIndex]; localMatch.deckJ1[monIndex] = localMatch.deckJ2[sonIndex]; localMatch.deckJ2[sonIndex] = tempDeck;
                let tempHp = localMatch.hpJ1; localMatch.hpJ1 = localMatch.hpJ2; localMatch.hpJ2 = tempHp;
                let tempMax = localMatch.maxHpDeckJ1[monIndex]; localMatch.maxHpDeckJ1[monIndex] = localMatch.maxHpDeckJ2[sonIndex]; localMatch.maxHpDeckJ2[sonIndex] = tempMax;
                logMsg = `🤖 ATTENTION : LE BOT SUBIT UN SWITCH ! 🔄`; declencher = true;
            }
            break;
        case 'reanimation':
            if (localMatch.indexJ2 > 0) {
                localMatch.indexJ2 -= 1; localMatch.maxHpDeckJ2[localMatch.indexJ2] = Math.round(25 * 0.66); localMatch.hpJ2 = localMatch.maxHpDeckJ2[localMatch.indexJ2];
                logMsg = `🤖 LE BOT ACTIVE : ${LISTE_POUVOIRS.reanimation.nom} !`; declencher = true;
            }
            break;
    }

    if (declencher) {
        botPouvoirUtilise = true;
        document.getElementById('enemyPouvoirBadge').innerText = "UTILISÉ 🛑";
        document.getElementById('combatLog').innerText = logMsg;
        if (typeof triggerBrawlNotification === 'function') triggerBrawlNotification(`ALERTE : BOT ACTIVE UN POUVOIR ! 🤖`, "banner-adversaire");
        if (typeof synchroniserVisuelsLocaux === 'function') synchroniserVisuelsLocaux();
        return true;
    }
    return false;
}
