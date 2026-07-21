// ========================================================
// POUVOIR.JS : SYSTEME DE POUVOIRS ET STRATÉGIES CORRIGÉ
// ========================================================

const LISTE_POUVOIRS = [
    { id: "dernier_souffle", nom: "Dernier Souffle", desc: "Ta carte gagne un boost de 25% de ses PV total et de ses attaques pendant 2 tours. Utilisable une seule fois.", type: "manuel" },
    { id: "vif_dor", nom: "Vif d'or", desc: "Tente une esquive à 75% de réussite. Si elle réussit, l'attaque adverse rebondira sur l'ennemi et tu peux attaquer ! Si elle échoue, tu subis l'attaque et tu passes ton prochain tour.", type: "manuel" },
    { id: "a_lagonie", nom: "À l'agonie", desc: "Ta carte actuelle ne pourra pas être tuée avant d'avoir atteint 1 point de vie, mais perd 25% de sa capacité d'attaque. Utilisable une seule fois.", type: "manuel" },
    { id: "soins", nom: "Soins", desc: "Tu peux soigner ta carte de 50% de ses PV total. Utilisable une seule fois.", type: "manuel" },
    { id: "switch", nom: "Switch", desc: "Tu peux switcher ta carte actuelle avec celle de ton adversaire à tout moment. Utilisable une seule fois.", type: "manuel" },
    { id: "outre_tombe", nom: "Outre tombe", desc: "Fait revivre une carte, mais toutes tes cartes subissent -25% d'attaques et de PV total. Utilisable une seule fois.", type: "manuel" },
    { id: "esquive_block", nom: "Esquive", desc: "Active une esquive à 75% de réussite. Si elle réussit, l'attaque adverse rebondit sur l'ennemi ! Si elle échoue, tu subis l'attaque et tu passes ton prochain tour.", type: "manuel" },
    { id: "en_rafale", nom: "En Rafale", desc: "Attaque 2 fois de suite, mais tu sautes ton prochain tour. Utilisable une seule fois.", type: "manuel" },
    { id: "mega_attaque", nom: "Méga Attaque", desc: "Inflige une frappe colossale (+50% de dégâts), mais te fait passer ton prochain tour et réduit l'attaque de tes autres cartes de 25%.", type: "manuel" }
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

    // CALCULE LES DÉGÂTS EN TENANT COMPTE DE TOUS LES MALUS/BONUS (Y COMPRIS OUTRE TOMBE & MÉGA ATTAQUE)
    ajusterDegats(degats, estJ1) {
        let val = degats;
        if (estJ1) {
            if (localMatch.toursDernierSouffleJ1 > 0) val = Math.round(val * 1.25);
            if (localMatch.aLagonieJ1Actif) val = Math.round(val * 0.75);
            if (localMatch.megaAttaqueMalusJ1) val = Math.round(val * 0.75);
            if (localMatch.outreTombeJ1Declenche) val = Math.round(val * 0.75); // Baisse l'attaque de 25% pour Outre Tombe
        } else {
            if (localMatch.toursDernierSouffleJ2 > 0) val = Math.round(val * 1.25);
            if (localMatch.aLagonieJ2Actif) val = Math.round(val * 0.75);
            if (localMatch.megaAttaqueMalusJ2) val = Math.round(val * 0.75);
            if (localMatch.outreTombeJ2Declenche) val = Math.round(val * 0.75);
        }
        return val;
    },

    obtenirChanceEsquive(defenseurEstJ1) {
        return 0.333; // Chance de base (1 sur 3)
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

    // ACTIVATION DES POUVOIRS JOUEUR
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
        else if(pid === "vif_dor" || pid === "esquive_block") {
            localMatch.pouvoirJ1Utilise = true;
            let reussite = Math.random() < 0.75; // 75% de chance de réussite
            if (reussite) {
                localMatch.esquiveJ1Active = true;
                logBox.innerText = "⚡ ESQUIVE RÉUSSIE (75%) ! L'attaque adverse rebondira sur lui ! Tu peux attaquer !";
            } else {
                localMatch.esquiveJ1Active = false;
                localMatch.skipNextTurnJ1 = true; // Subit l'attaque ET passe son prochain tour
                logBox.innerText = "❌ ESQUIVE ÉCHOUÉE ! Tu subiras la prochaine attaque et tu passeras ton prochain tour !";
            }
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
                localMatch.outreTombeJ1Declenche = true; // Activer le malus de -25% ATQ
                localMatch.maxHpDeckJ1 = localMatch.maxHpDeckJ1.map(hp => Math.round(hp * 0.75));
                localMatch.currentHpDeckJ1 = localMatch.currentHpDeckJ1.map((hp, i) => hp <= 0 ? localMatch.maxHpDeckJ1[i] : Math.round(hp * 0.75));
                localMatch.hpJ1 = localMatch.currentHpDeckJ1[localMatch.indexJ1];
                logBox.innerText = "💀 Pouvoir utilisé : Carte réanimée ! (-25% PV et Attaque globale)";
                synchroniserVisuelsLocaux();
            } else { alert("Aucune carte n'est KO !"); }
        }
        else if(pid === "en_rafale") {
            localMatch.pouvoirJ1Utilise = true;
            localMatch.skipNextTurnJ1 = true; // Marque le prochain tour pour être sauté
            localMatch.rafaleEnCoursJ1 = true;
            logBox.innerText = "💥 POUVOIR EN RAFALE ! Première frappe...";
            preparerAttaque();
        }
        else if(pid === "mega_attaque") {
            localMatch.pouvoirJ1Utilise = true;
            localMatch.skipNextTurnJ1 = true; // Marque le prochain tour pour être sauté
            localMatch.megaAttaqueMalusJ1 = true;
            
            let monIndexVis = localMatch.indexJ1 >= 3 ? 2 : localMatch.indexJ1;
            let foundCard = myCollection.find(c => (c.Pokemon_API_ID || "").toString() === localMatch.deckJ1[monIndexVis].toString());
            let atqBonus = foundCard ? (parseInt(foundCard.Attaque_Bonus) || 0) : 0;
            
            // Attaque 50% plus puissante (+50%)
            let dmgBase = Math.floor(Math.random() * 12) + 10 + atqBonus;
            let dmgColossal = Math.round(dmgBase * 1.5);
            dmgColossal = this.ajusterDegats(dmgColossal, true);

            logBox.innerText = "⚡ MÉGA ATTAQUE DÉCHAÎNÉE (+50% DÉGÂTS) !";
            jouerCoupLocal('attaque', dmgColossal, 'eclair');
        }
    },

    // ANALYSE ET ACTIVATION DES POUVOIRS DU BOT
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
        else if (pid === "vif_dor" || pid === "esquive_block") {
            if (localMatch.hpJ2 <= 18) {
                localMatch.pouvoirJ2Utilise = true;
                let reussite = Math.random() < 0.75;
                if (reussite) {
                    localMatch.esquiveJ2Active = true;
                    logBox.innerText = "🤖 Le Bot active : ESQUIVE RÉUSSIE (75%) !";
                } else {
                    localMatch.esquiveJ2Active = false;
                    localMatch.skipNextTurnJ2 = true;
                    logBox.innerText = "🤖 Le Bot tente une ESQUIVE et ÉCHOUE !";
                }
            }
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
            localMatch.outreTombeJ2Declenche = true;
            localMatch.maxHpDeckJ2 = localMatch.maxHpDeckJ2.map(hp => Math.round(hp * 0.75));
            localMatch.currentHpDeckJ2 = localMatch.currentHpDeckJ2.map((hp, i) => hp <= 0 ? localMatch.maxHpDeckJ2[i] : Math.round(hp * 0.75));
            localMatch.hpJ2 = localMatch.currentHpDeckJ2[localMatch.indexJ2];
            logBox.innerText = "💀 Le Bot utilise : OUTRE TOMBE !";
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
            let dmgBase = Math.floor(Math.random() * 12) + 10 + botAtqBonus;
            let dmgColossal = Math.round(dmgBase * 1.5);
            dmgColossal = this.ajusterDegats(dmgColossal, false);
            logBox.innerText = "🤖 LE BOT DÉCHAÎNE UNE MÉGA ATTAQUE (+50%) !";
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
