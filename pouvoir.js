// ========================================================
// POUVOIR.JS : SYSTEME DE POUVOIRS ET STRATÉGIES
// ========================================================

const LISTE_POUVOIRS = [
    { id: "dernier_souffle", nom: "Dernier Souffle", desc: "Ta carte gagne un boost de 25% de ses PV total et de ses attaques pendant 2 tours. Utilisable une seule fois.", type: "manuel" },
    { id: "vif_dor", nom: "Vif d'or", desc: "Ta carte actuel a 75% de chance de réussir son esquive. Si elle réussit, tu attaques tout de suite après ! Si elle échoue, tu passes ton prochain tour. Pouvoir actif pendant 2 tours.", type: "manuel" },
    { id: "a_lagonie", nom: "À l'agonie", desc: "Ta carte actuel ne pourra pas être tué avant d'avoir attein 1 point de vie, mais perd 25% de sa capacité d'attaque. Utilisable une seule fois.", type: "manuel" },
    { id: "soins", nom: "Soins", desc: "Tu peut soigner ta carte de 50% de ses pv totale. Utilisable une seule fois.", type: "manuel" },
    { id: "switch", nom: "Switch", desc: "Tu peut switcher ta carte actuel avec celle de ton adversaire a tout moment. Utilisable une seule fois.", type: "manuel" },
    { id: "outre_tombe", nom: "Outre tombe", desc: "Faire revivre une carte, mais toute tes cartes ont -25% d'attaques et de pv totale. Utilisable qu'une seule fois.", type: "manuel" },
    { id: "esquive_block", nom: "Esquive", desc: "Empêche l'adversaire d'utiliser son pouvoir pendant 1 tour et augmente tes chances d'esquive à 60% pendant 1 tour. Utilisable une seule fois.", type: "manuel" },
    { id: "en_rafale", nom: "En Rafale", desc: "Attaque 2 fois de suite, perd 1 tour. Utilisable une seule fois en combat.", type: "manuel" },
    { id: "mega_attaque", nom: "Méga Attaque", desc: "Inflige une frappe colossale (+100% de dégâts), mais fait passer ton prochain tour et réduit l'attaque de tes autres cartes de 25%. Utilisable une seule fois.", type: "manuel" }
];

const PouvoirManager = {
    slotModalInst: null,
    callbackAttente: null,

    declencherTirageSlotMachine(callbackFin) {
        if(!this.slotModalInst) {
            this.slotModalInst = new bootstrap.Modal(document.getElementById('slotMachineModal'));
        }
        const sPlayer = document.getElementById('slotPlayer');
        const sBot = document.getElementById('slotBot');
        const sDesc = document.getElementById('slotDesc');
        const btnGo = document.getElementById('btnStartAfterSlot');
        
        btnGo.classList.add('d-none');
        sPlayer.classList.add('slot-rolling');
        sBot.classList.add('slot-rolling');
        sDesc.innerText = "Tirage des super-pouvoirs...";
        this.slotModalInst.show();

        let count = 0;
        let interval = setInterval(() => {
            sPlayer.innerText = LISTE_POUVOIRS[Math.floor(Math.random() * LISTE_POUVOIRS.length)].nom;
            sBot.innerText = LISTE_POUVOIRS[Math.floor(Math.random() * LISTE_POUVOIRS.length)].nom;
            count++;
            if(count > 15) {
                clearInterval(interval);
                const p1 = LISTE_POUVOIRS[Math.floor(Math.random() * LISTE_POUVOIRS.length)];
                const p2 = LISTE_POUVOIRS[Math.floor(Math.random() * LISTE_POUVOIRS.length)];
                
                localMatch.pouvoirJ1 = p1;
                localMatch.pouvoirJ2 = p2;
                
                sPlayer.classList.remove('slot-rolling');
                sBot.classList.remove('slot-rolling');
                
                sPlayer.innerText = p1.nom;
                sBot.innerText = p2.nom;
                sDesc.innerHTML = `<span class="text-success">Toi: ${p1.desc}</span><br><span class="text-white">Bot: ${p2.desc}</span>`;
                
                btnGo.classList.remove('d-none');
                this.initialiserPouvoirsMatch();
                this.callbackAttente = callbackFin;
            }
        }, 100);
    },

    initialiserPouvoirsMatch() {
        localMatch.pouvoirJ1Utilise = false; localMatch.pouvoirJ2Utilise = false;
        localMatch.toursDernierSouffleJ1 = 0; localMatch.toursDernierSouffleJ2 = 0;
        localMatch.toursVifDorJ1 = 0; localMatch.toursVifDorJ2 = 0;
        localMatch.toursEsquiveBoostJ1 = 0; localMatch.toursEsquiveBoostJ2 = 0;
        localMatch.toursPouvoirBloqueBot = 0; localMatch.toursPouvoirBloqueJoueur = 0;
        localMatch.aLagonieJ1Actif = false; localMatch.aLagonieJ2Actif = false;
        localMatch.outreTombeJ1Declenche = false; localMatch.outreTombeJ2Declenche = false;
        localMatch.megaAttaqueMalusJ1 = false; localMatch.megaAttaqueMalusJ2 = false;
        localMatch.skipNextTurnJ1 = false; localMatch.skipNextTurnJ2 = false;
        localMatch.rafaleEnCoursJ1 = false; localMatch.rafaleEnCoursJ2 = false;
    },

    fermerSlotEtLancerCombat() {
        if(this.slotModalInst) this.slotModalInst.hide();
        if(this.callbackAttente) this.callbackAttente();
    },

    ajusterDegats(degats, estJ1) {
        let val = degats;
        if (estJ1) {
            if (localMatch.toursDernierSouffleJ1 > 0) val = Math.round(val * 1.25);
            if (localMatch.aLagonieJ1Actif) val = Math.round(val * 0.75);
            if (localMatch.megaAttaqueMalusJ1) val = Math.round(val * 0.75);
        } else {
            if (localMatch.toursDernierSouffleJ2 > 0) val = Math.round(val * 1.25);
            if (localMatch.aLagonieJ2Actif) val = Math.round(val * 0.75);
            if (localMatch.megaAttaqueMalusJ2) val = Math.round(val * 0.75);
        }
        return val;
    },

    obtenirChanceEsquive(defenseurEstJ1) {
        if (defenseurEstJ1) {
            if (localMatch.toursVifDorJ1 > 0) return 0.75;
            if (localMatch.toursEsquiveBoostJ1 > 0) return 0.60;
        } else {
            if (localMatch.toursVifDorJ2 > 0) return 0.75;
            if (localMatch.toursEsquiveBoostJ2 > 0) return 0.60;
        }
        return 0.333;
    },

    gererEncaisserDegatsJ1(degats) {
        const logBox = document.getElementById('combatLog');
        let futurHp = localMatch.hpJ1 - degats;
        if (futurHp <= 0 && localMatch.aLagonieJ1Actif && localMatch.hpJ1 > 1) {
            localMatch.hpJ1 = 1;
            logBox.innerText = "🩹 À l'agonie ! Ta carte se bloque à 1 PV !";
            return false;
        }
        localMatch.hpJ1 = futurHp;
        return localMatch.hpJ1 <= 0;
    },

    gererEncaisserDegatsJ2(degats) {
        const logBox = document.getElementById('combatLog');
        let futurHp = localMatch.hpJ2 - degats;
        if (futurHp <= 0 && localMatch.aLagonieJ2Actif && localMatch.hpJ2 > 1) {
            localMatch.hpJ2 = 1;
            logBox.innerText = "🤖 À l'agonie ! Le Bot encaisse et survit à 1 PV !";
            return false;
        }
        localMatch.hpJ2 = futurHp;
        return localMatch.hpJ2 <= 0;
    },

    activerPouvoirManuel() {
        if(localMatch.tourA !== "J1" || localMatch.pouvoirJ1Utilise || !localMatch.pouvoirJ1) return;
        if(localMatch.toursPouvoirBloqueJoueur > 0) {
            alert("Ton pouvoir est bloqué par l'adversaire ce tour-ci !");
            return;
        }

        const pid = localMatch.pouvoirJ1.id;
        const logBox = document.getElementById('combatLog');

        if(pid === "dernier_souffle") {
            localMatch.pouvoirJ1Utilise = true; localMatch.toursDernierSouffleJ1 = 2;
            localMatch.maxHpDeckJ1[localMatch.indexJ1] = Math.round(localMatch.maxHpDeckJ1[localMatch.indexJ1] * 1.25);
            localMatch.hpJ1 = Math.round(localMatch.hpJ1 * 1.25);
            logBox.innerText = "💥 Pouvoir activé : +25% PV et ATQ (2 tours) !";
            synchroniserVisuelsLocaux();
        }
        else if(pid === "vif_dor") {
            localMatch.pouvoirJ1Utilise = true; localMatch.toursVifDorJ1 = 2;
            logBox.innerText = "⚡ Pouvoir activé : 75% d'esquive pendant 2 tours !";
            synchroniserVisuelsLocaux();
        }
        else if(pid === "a_lagonie") {
            localMatch.pouvoirJ1Utilise = true; localMatch.aLagonieJ1Actif = true;
            logBox.innerText = "🩹 Pouvoir activé : Survie à 1 PV assurée (-25% ATQ) !";
            synchroniserVisuelsLocaux();
        }
        else if(pid === "soins") {
            let limit = localMatch.maxHpDeckJ1[localMatch.indexJ1];
            localMatch.hpJ1 = Math.min(limit, localMatch.hpJ1 + Math.round(limit * 0.5));
            localMatch.pouvoirJ1Utilise = true;
            logBox.innerText = "✨ Pouvoir utilisé : 50% de tes PV soignés !";
            synchroniserVisuelsLocaux();
        } 
        else if(pid === "switch") {
            let mI = localMatch.indexJ1; let sI = localMatch.indexJ2;
            let tHp = localMatch.hpJ1; localMatch.hpJ1 = localMatch.hpJ2; localMatch.hpJ2 = tHp;
            let tMx = localMatch.maxHpDeckJ1[mI]; localMatch.maxHpDeckJ1[mI] = localMatch.maxHpDeckJ2[sI]; localMatch.maxHpDeckJ2[sI] = tMx;
            let tCd = localMatch.deckJ1[mI]; localMatch.deckJ1[mI] = localMatch.deckJ2[sI]; localMatch.deckJ2[sI] = tCd;
            localMatch.pouvoirJ1Utilise = true;
            logBox.innerText = "🔄 Pouvoir utilisé : Interversion des combattants !";
            synchroniserVisuelsLocaux();
        }
        else if(pid === "outre_tombe") {
            let indexMort = localMatch.currentHpDeckJ1.findIndex(hp => hp <= 0);
            if(indexMort !== -1) {
                localMatch.pouvoirJ1Utilise = true;
                localMatch.maxHpDeckJ1 = localMatch.maxHpDeckJ1.map(hp => Math.round(hp * 0.75));
                localMatch.currentHpDeckJ1 = localMatch.currentHpDeckJ1.map((hp, i) => hp <= 0 ? localMatch.maxHpDeckJ1[i] : Math.round(hp * 0.75));
                localMatch.hpJ1 = localMatch.currentHpDeckJ1[localMatch.indexJ1];
                logBox.innerText = "💀 Pouvoir utilisé : Cartes KO réanimées ! (-25% stats globales)";
                synchroniserVisuelsLocaux();
            } else { alert("Aucune carte n'est KO !"); }
        }
        else if(pid === "esquive_block") {
            localMatch.pouvoirJ1Utilise = true; 
            localMatch.toursPouvoirBloqueBot = 1;
            localMatch.toursEsquiveBoostJ1 = 1;
            logBox.innerText = "🚫 POUVOIR ESQUIVE : Pouvoir du Bot bloqué pendant 1 tour et tes chances d'esquiver montent à 60% !";
            synchroniserVisuelsLocaux();
        }
        else if(pid === "en_rafale") {
            localMatch.pouvoirJ1Utilise = true;
            localMatch.skipNextTurnJ1 = true;
            localMatch.rafaleEnCoursJ1 = true;
            logBox.innerText = "💥 POUVOIR EN RAFALE ! Lancement de la première attaque...";
            preparerAttaque();
        }
        else if(pid === "mega_attaque") {
            localMatch.pouvoirJ1Utilise = true;
            localMatch.skipNextTurnJ1 = true;
            localMatch.megaAttaqueMalusJ1 = true;
            
            let monIndexVis = localMatch.indexJ1 >= 3 ? 2 : localMatch.indexJ1;
            let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === localMatch.deckJ1[monIndexVis].toString());
            let atqBonus = foundCard ? (parseInt(foundCard.Attaque_Bonus) || 0) : 0;
            let dmgColossal = (Math.floor(Math.random() * 12) + 10 + atqBonus) * 2;
            dmgColossal = this.ajusterDegats(dmgColossal, true);

            logBox.innerText = "⚡ MÉGA ATTAQUE DÉCHAÎNÉE ! Frappe colossale !";
            jouerCoupLocal('attaque', dmgColossal, 'eclair');
        }
    },

    analyserEtExecuterPouvoirBot() {
        if (localMatch.pouvoirJ2Utilise || !localMatch.pouvoirJ2 || localMatch.toursPouvoirBloqueBot > 0) return;
        const pid = localMatch.pouvoirJ2.id;
        const maxBot = localMatch.maxHpDeckJ2[localMatch.indexJ2];
        const logBox = document.getElementById('combatLog');

        if (pid === "dernier_souffle" && localMatch.hpJ2 <= (maxBot * 0.75)) {
            localMatch.pouvoirJ2Utilise = true; localMatch.toursDernierSouffleJ2 = 2;
            localMatch.maxHpDeckJ2[localMatch.indexJ2] = Math.round(localMatch.maxHpDeckJ2[localMatch.indexJ2] * 1.25);
            localMatch.hpJ2 = Math.round(localMatch.hpJ2 * 1.25);
            logBox.innerText = "🤖 Le Bot active : DERNIER SOUFFLE ! (+25% PV/ATQ)";
        }
        else if (pid === "vif_dor" && localMatch.hpJ2 <= 15) {
            localMatch.pouvoirJ2Utilise = true; localMatch.toursVifDorJ2 = 2;
            logBox.innerText = "🤖 Le Bot active : VIF D'OR ! (75% d'esquive)";
        }
        else if (pid === "a_lagonie" && localMatch.hpJ2 <= 8) {
            localMatch.pouvoirJ2Utilise = true; localMatch.aLagonieJ2Actif = true;
            logBox.innerText = "🤖 Le Bot active : À L'AGONIE !";
        }
        else if (pid === "soins" && localMatch.hpJ2 <= (maxBot * 0.5)) {
            localMatch.hpJ2 = Math.min(maxBot, localMatch.hpJ2 + Math.round(maxBot * 0.5));
            localMatch.pouvoirJ2Utilise = true;
            logBox.innerText = "✨ Le Bot utilise : SOINS ! (+50% PV)";
        }
        else if (pid === "switch" && localMatch.hpJ2 < 8 && localMatch.hpJ1 > 16) {
            let mI = localMatch.indexJ1; let sI = localMatch.indexJ2;
            let tHp = localMatch.hpJ1; localMatch.hpJ1 = localMatch.hpJ2; localMatch.hpJ2 = tHp;
            let tMx = localMatch.maxHpDeckJ1[mI]; localMatch.maxHpDeckJ1[mI] = localMatch.maxHpDeckJ2[sI]; localMatch.maxHpDeckJ2[sI] = tMx;
            let tCd = localMatch.deckJ1[mI]; localMatch.deckJ1[mI] = localMatch.deckJ2[sI]; localMatch.deckJ2[sI] = tCd;
            localMatch.pouvoirJ2Utilise = true;
            logBox.innerText = "🔄 Le Bot utilise : SWITCH !";
        }
        else if (pid === "outre_tombe" && localMatch.currentHpDeckJ2.some(hp => hp <= 0)) {
            localMatch.pouvoirJ2Utilise = true;
            localMatch.maxHpDeckJ2 = localMatch.maxHpDeckJ2.map(hp => Math.round(hp * 0.75));
            localMatch.currentHpDeckJ2 = localMatch.currentHpDeckJ2.map((hp, i) => hp <= 0 ? localMatch.maxHpDeckJ2[i] : Math.round(hp * 0.75));
            localMatch.hpJ2 = localMatch.currentHpDeckJ2[localMatch.indexJ2];
            logBox.innerText = "💀 Le Bot utilise : OUTRE TOMBE !";
        }
        else if (pid === "esquive_block" && localMatch.toursVifDorJ1 > 0) {
            localMatch.pouvoirJ2Utilise = true; 
            localMatch.toursPouvoirBloqueJoueur = 1;
            localMatch.toursEsquiveBoostJ2 = 1;
            logBox.innerText = "🚫 Le Bot utilise ESQUIVE ! Ton pouvoir est bloqué pendant 1 tour et ses chances d'esquive montent à 60% !";
        }
        else if (pid === "en_rafale" && localMatch.hpJ1 >= 15) {
            localMatch.pouvoirJ2Utilise = true;
            localMatch.skipNextTurnJ2 = true;
            localMatch.rafaleEnCoursJ2 = true;
        }
        else if (pid === "mega_attaque" && localMatch.hpJ1 >= 18) {
            localMatch.pouvoirJ2Utilise = true;
            localMatch.skipNextTurnJ2 = true;
            localMatch.megaAttaqueMalusJ2 = true;
            let sonIndexVis = localMatch.indexJ2 >= 3 ? 2 : localMatch.indexJ2;
            let botAtqBonus = localMatch.botAtqBonusDeck[sonIndexVis];
            let dmgColossal = (Math.floor(Math.random() * 12) + 10 + botAtqBonus) * 2;
            dmgColossal = this.ajusterDegats(dmgColossal, false);
            logBox.innerText = "🤖 LE BOT DÉCHAÎNE UNE MÉGA ATTAQUE !";
            jouerCoupLocal('attaque', dmgColossal, 'eclair');
        }
    },

    decrementerTours() {
        if(localMatch.tourA === "J1") {
            if (localMatch.toursDernierSouffleJ1 > 0) localMatch.toursDernierSouffleJ1--;
            if (localMatch.toursVifDorJ1 > 0) localMatch.toursVifDorJ1--;
            if (localMatch.toursEsquiveBoostJ1 > 0) localMatch.toursEsquiveBoostJ1--;
            if (localMatch.toursPouvoirBloqueJoueur > 0) localMatch.toursPouvoirBloqueJoueur--;
        }
        if(localMatch.tourA === "J2") {
            if (localMatch.toursDernierSouffleJ2 > 0) localMatch.toursDernierSouffleJ2--;
            if (localMatch.toursVifDorJ2 > 0) localMatch.toursVifDorJ2--;
            if (localMatch.toursEsquiveBoostJ2 > 0) localMatch.toursEsquiveBoostJ2--;
            if (localMatch.toursPouvoirBloqueBot > 0) localMatch.toursPouvoirBloqueBot--;
        }
    }
};
