<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Zone de Combat - Mode Bot & Multi</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
    
    <!-- LIBRAIRIE PEERJS -->
    <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>

    <style>
        :root { 
            --brawl-yellow: #FFF200; --brawl-blue: #00A6FF; --brawl-orange: #FF5500; 
            --brawl-green: #10D010; --brawl-pink: #FF007F; --brawl-purple: #240046;
            --feu-color: #FF4500; --eau-color: #00BFFF; --eclair-color: #FFD700; --feuille-color: #32CD32;
            --neon-green: #00FFCC; --neon-pink: #FF007F;
        }
        *, *::before, *::after { box-sizing: border-box; }
        
        body { 
            font-family: 'Montserrat', sans-serif; background: radial-gradient(circle, #20003b 0%, #090014 100%); 
            color: #fff; min-height: 100vh; user-select: none; margin: 0; padding: 0;
        }
        body.in-battle { height: 100vh; max-height: 100vh; overflow: hidden; }
        
        .brawl-font { font-family: 'Luckiest Guy', cursive; -webkit-text-stroke: 2px #000; text-shadow: 4px 4px 0px #000; }
        .brawl-font-sm { font-family: 'Luckiest Guy', cursive; -webkit-text-stroke: 1.5px #000; text-shadow: 2px 2px 0px #000; }
        .login-container { max-width: 450px; margin: 5vh auto; background: rgba(0, 0, 0, 0.6); border: 6px solid #000; border-radius: 25px; }
        
        .brawl-btn { 
            font-family: 'Luckiest Guy', cursive; font-size: 1.2rem; color: white !important; text-shadow: 2px 2px 0px #000; 
            border: 4px solid #000; border-radius: 15px; box-shadow: 0px 6px 0px #000; transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .brawl-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0px 2px 0px #000; }
        .brawl-btn:disabled { opacity: 0.5; box-shadow: none; transform: none; }
        
        .btn-yellow { background-color: var(--brawl-yellow); color: #000 !important; text-shadow: none; }
        .btn-blue { background-color: var(--brawl-blue); } 
        .btn-orange { background-color: var(--brawl-orange); } 
        .btn-green { background-color: var(--brawl-green); } 
        .btn-pink { background-color: var(--brawl-pink); }
        .brawl-card { background: var(--brawl-purple); border: 4px solid #000; border-radius: 20px; box-shadow: 0px 8px 0px #000; }
        
        .pokemon-card-wrapper { 
            background: rgba(0, 0, 0, 0.4); padding: 6px; border: 5px solid #000; border-radius: 18px; 
            aspect-ratio: 5 / 7; cursor: pointer; display: inline-block; position: relative; overflow: hidden;
            box-shadow: 0px 6px 0px #000; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #setupPhase .pokemon-card-wrapper { width: 100%; max-width: 145px; border-color: var(--neon-green); }
        #setupPhase .pokemon-card-wrapper.selected { border-color: var(--brawl-yellow) !important; transform: translateY(-5px) scale(1.06); }

        #battlePhase { height: 100vh; max-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; padding: 6px; position: relative; }
        .zone-adversaire { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255, 0, 0, 0.05); border: 4px solid #000; border-radius: 16px; margin-bottom: 4px; padding: 4px; position: relative; }
        .zone-moi { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(0, 255, 0, 0.05); border: 4px solid #000; border-radius: 16px; margin-bottom: 4px; padding: 4px; position: relative; }
        
        #battlePhase .pokemon-card-wrapper { flex: 1; min-height: 0; height: 45%; max-height: 110px; width: auto; border-color: var(--neon-green); }
        .zone-actions-bas { display: flex; gap: 8px; width: 100%; padding-bottom: env(safe-area-inset-bottom, 2px); flex-shrink: 0; }
        .zone-actions-bas .brawl-btn { flex: 1; font-size: 1.1rem; padding: 8px 0; border-radius: 12px; }
        .pokemon-card-img { height: 100%; width: 100%; object-fit: contain; border-radius: 6px; display: block; }

        .hp-bar-container { background: #222; border: 3px solid #000; border-radius: 8px; height: 18px; width: 65%; position: relative; overflow: hidden; margin-bottom: 2px; }
        .hp-bar-fill { background: linear-gradient(to right, #ff0055, #10d010); height: 100%; width: 100%; transition: width 0.3s ease; }
        .hp-text { position: absolute; width: 100%; text-align: center; top: -1px; left: 0; font-family: 'Luckiest Guy', cursive; font-size: 0.75rem; color: #fff; -webkit-text-stroke: 1px #000; }
        
        .atq-stat-badge { font-family: 'Luckiest Guy', cursive; font-size: 0.85rem; color: #FFF200; -webkit-text-stroke: 1px #000; }
        .log-box { background: rgba(0,0,0,0.85); border: 3px solid #000; border-radius: 10px; padding: 4px 8px; font-size: 0.85rem; font-weight: bold; width: 100%; text-align: center; margin: 4px 0; min-height: 38px; }
        .mini-card { width: 26px; height: 36px; object-fit: contain; border-radius: 4px; border: 2px solid #000; margin: 1px; display: inline-block; }
        .mini-card.ko-mini { filter: grayscale(1) brightness(0.2); opacity: 0.3; }
        .mini-card.active-mini { border-color: var(--brawl-yellow); transform: scale(1.08); }

        .fx-projectile { position: fixed; font-size: 3.5rem; z-index: 9999; pointer-events: none; }
        .fx-particle { position: fixed; width: 6px; height: 6px; border-radius: 50%; z-index: 10000; pointer-events: none; }
        
        .brawl-banner-container { position: fixed; top: 40%; left: 0; width: 100%; pointer-events: none; z-index: 99999; display: none; }
        .brawl-banner-text { font-family: 'Luckiest Guy', cursive; font-size: 2.5rem; text-align: center; -webkit-text-stroke: 2px #000; }
        .banner-moi { color: var(--brawl-yellow); } .banner-adversaire { color: #FF3333; }
        
        .slot-box { background: #111; border: 3px solid #333; border-radius: 15px; padding: 15px; min-height: 90px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 900; }
        .slot-rolling { animation: slotBlur 0.1s infinite linear; }
        @keyframes slotBlur { 0% { filter: blur(1px); } 50% { filter: blur(2px); } 100% { filter: blur(1px); } }
    </style>
</head>
<body>

    <div id="nonBattleInterface" class="container py-3">
        <div id="headerBar" class="d-flex justify-content-between align-items-center mb-3 d-none">
            <div><h2 class="brawl-font text-warning mb-0" id="displayUsername">JOUEUR</h2></div>
            <div class="d-flex gap-2">
                <button onclick="handleLogout()" class="btn brawl-btn btn-pink px-3 py-2">🚪 DÉCONNEXION</button>
                <button onclick="window.location.href='https://tommyaudetcontact-wq.github.io/brawlTasks2.0/'" class="btn brawl-btn btn-pink px-4 py-2">⬅ QUITTER</button>
            </div>
        </div>

        <div id="loginPage" class="login-container p-5 text-center">
            <h1 class="brawl-font text-info mb-4" style="font-size: 3rem;">ARÈNE DE COMBAT</h1>
            <div class="mb-4 text-start">
                <label class="form-label fw-bold">Choisis ton nom :</label>
                <select id="usernameSelect" class="form-select bg-dark text-white"><option value="">Chargement...</option></select>
            </div>
            <button onclick="handleLogin()" class="btn brawl-btn btn-yellow w-100 py-3">SE CONNECTER</button>
        </div>

        <div id="lobbyPhase" class="brawl-card p-4 mb-4 text-center d-none">
            <h3 class="brawl-font text-info mb-3">CHOIX DU MODE DE JEU</h3>
            
            <div class="row g-3 justify-content-center mx-auto" style="max-width: 500px;">
                <div class="col-12">
                    <button onclick="lancerConfigurationDeck('bot')" class="btn brawl-btn btn-orange w-100 py-3">🤖 DÉFIER LE BOT (SOLO)</button>
                </div>
                <div class="col-12"><hr class="border-secondary"></div>
                <div class="col-md-6">
                    <button onclick="MultiplayerManager.creerDuel()" class="btn brawl-btn btn-green w-100 py-3">🌐 CRÉER UN DUEL</button>
                </div>
                <div class="col-md-6">
                    <div class="input-group">
                        <input type="number" id="joinCodeInput" class="form-control form-control-lg bg-dark text-white text-center border-secondary fw-bold" placeholder="1234">
                        <button onclick="MultiplayerManager.rejoindreDuel()" class="btn brawl-btn btn-blue">⚔️ REJOINDRE</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="setupPhase" class="brawl-card p-4 mb-4 d-none">
            <h3 class="brawl-font text-center text-warning mb-4" id="setupTitle">CHOISIS TES 3 POKÉMONS DE COMBAT</h3>
            <div id="selectionGrid" class="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-4 mb-4 justify-content-center"></div>
            <div class="text-center"><button id="startMatchBtn" onclick="validerMonDeck()" class="btn brawl-btn btn-green px-5 py-3 fs-4" disabled>LANCER LE COMBAT (0/3)</button></div>
        </div>
    </div>

    <!-- MODAL ATTENTE DUEL MULTIJOUEUR -->
    <div class="modal fade" id="multiWaitingModal" data-bs-backdrop="static" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark border-info p-4 text-center text-white" style="border: 5px solid var(--brawl-blue); border-radius:25px;">
                <h2 class="brawl-font text-info mb-2">DUEL EN LIGNE</h2>
                <p class="fs-5 mb-1">Donne ce code à ton ami pour qu'il te rejoigne :</p>
                <div id="displayRoomCode" class="brawl-font text-warning my-3" style="font-size: 3.5rem; letter-spacing: 5px;">----</div>
                <div class="spinner-border text-info my-2" role="status"></div>
                <div class="small text-muted mt-2">En attente de connexion du joueur 2...</div>
            </div>
        </div>
    </div>

    <div id="battlePhase" class="d-none">
        <!-- BOUTON [ i ] EN HAUT À DROITE -->
<button class="position-absolute top-0 end-0 m-2 btn btn-warning fw-bold brawl-font-sm" data-bs-toggle="modal" data-bs-target="#infoPouvoirsModal" style="z-index: 999; border: 2px solid #000; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">i</button>
        <div id="enemyPouvoirTopBadge" class="position-absolute top-0 start-0 m-2 badge bg-dark text-white brawl-font-sm" style="border: 2px solid #ffffff; z-index: 999; font-size: 0.85rem;">ADVERSAIRE : ???</div>
        <button class="position-absolute top-0 end-0 m-2 btn btn-info-brawl" data-bs-toggle="modal" data-bs-target="#infoPouvoirsModal">i</button>
        <div id="brawlTurnBanner" class="brawl-banner-container"><div id="brawlBannerText" class="brawl-banner-text">À TON TOUR ! 🔥</div></div>

        <!-- ZONE ENNEMI -->
        <div class="zone-adversaire" id="enemyFighterCardNode">
            <div id="enemyCardBattleLvlText" class="brawl-font-sm text-danger text-center mb-1" style="font-size: 1.1rem;">NIVEAU 1</div>
            <div class="hp-bar-container"><div id="enemyHpBar" class="hp-bar-fill"></div><div id="enemyHpText" class="hp-text">25 / 25 PV</div></div>
            <div id="enemyAtqText" class="atq-stat-badge">⚔️ ATTAQUE : 10 - 21</div>
            <div class="pokemon-card-wrapper mt-1" id="enemyCardAnchor"><img id="enemyFighterImg" src="" class="pokemon-card-img"></div>
            <div id="enemyMiniDeck" class="d-flex justify-content-center mt-1"></div>
            <h5 class="brawl-font-sm text-danger mt-1 mb-0" id="battleEnemyName">ADVERSAIRE</h5>
        </div>
        
        <div class="log-box text-warning" id="combatLog">Le match va débuter...</div>
        
        <!-- ZONE JOUEUR -->
        <div class="zone-moi" id="myFighterCardNode">
            <div id="cardBattleLvlText" class="brawl-font-sm text-warning text-center mb-1" style="font-size: 1.1rem;">NIVEAU 1</div>
            <div class="hp-bar-container"><div id="playerHpBar" class="hp-bar-fill"></div><div id="playerHpText" class="hp-text">25 / 25 PV</div></div>
            <div id="playerAtqText" class="atq-stat-badge">⚔️ ATTAQUE : 10 - 21</div>
            <div class="pokemon-card-wrapper mt-1" id="myCardAnchor"><img id="playerFighterImg" src="" class="pokemon-card-img"></div>
            <div id="playerMiniDeck" class="d-flex justify-content-center mt-1"></div>
            <h5 class="brawl-font-sm text-success mt-1 mb-0" id="battlePlayerName">MOI</h5>
            <div id="cardBattleStatusText" class="fw-bold text-center small" style="font-size: 0.75rem;"></div>
        </div>
        
        <div id="actionControls" class="zone-actions-bas d-flex flex-wrap gap-2">
            <button id="btnAttaque" onclick="preparerAttaque()" class="btn brawl-btn btn-orange flex-fill">ATTAQUE ⚔️</button>
            <button id="btnEsquive" onclick="jouerCoupLocal('esquive')" class="btn brawl-btn btn-blue flex-fill">ESQUIVE 🛡️</button>
            <button id="btnPouvoirSpecial" onclick="activerPouvoirManuel()" class="btn brawl-btn btn-pink w-100 mt-1 d-none">UTILISER LE POUVOIR 🌟</button>
        </div>
    </div>

    <!-- MODAL SLOT MACHINE -->
    <div class="modal fade" id="slotMachineModal" data-bs-backdrop="static" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark border-warning p-4 text-center text-white" style="border: 6px solid var(--brawl-yellow); border-radius:25px;">
                <h2 class="brawl-font text-warning mb-3" style="font-size: 2.3rem;">🎰 POUVOIRS ALÉATOIRES 🎰</h2>
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <div class="small fw-bold text-success mb-1">TON POUVOIR</div>
                        <div id="slotPlayer" class="slot-box brawl-font text-wrap text-center">???</div>
                    </div>
                    <div class="col-6">
                        <div class="small fw-bold text-light mb-1">ADVERSAIRE</div>
                        <div id="slotBot" class="slot-box brawl-font text-wrap text-center">???</div>
                    </div>
                </div>
                <div id="slotDesc" class="fw-bold text-light small bg-black/40 p-2 rounded border border-secondary">Attribution des capacités spéciales...</div>
                <button id="btnStartAfterSlot" onclick="PouvoirManager.fermerSlotEtLancerCombat()" class="btn brawl-btn btn-green w-100 py-3 mt-3 fs-5 d-none">ENTRER DANS L'ARÈNE ⚔️</button>
            </div>
        </div>
    </div>

    <!-- MODAL RÉSULTAT RPG -->
    <div class="modal fade" id="rewardModal" data-bs-backdrop="static" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark border-success p-4 text-center text-white" style="border: 6px solid var(--brawl-green); border-radius:25px;">
                <h1 class="brawl-font text-warning mb-1" style="font-size: 3.2rem;" id="rewardTitle">FIN DU COMBAT</h1>
                <p class="fs-4 text-white font-monospace fw-bold mb-3" id="rewardXpText">+0 XP Gagné</p>
                <h5 class="brawl-font text-start text-warning mb-2" style="font-size:1.1rem;">📈 EXPÉRIENCE DES CARTES (+10 XP) :</h5>
                <div id="cardsXpSummary" class="text-start mb-4 bg-black/50 p-3 rounded-3 border border-secondary"></div>

                <div id="levelUpSection" class="d-none my-3 p-3 bg-black border border-warning rounded">
                    <h3 class="brawl-font text-danger">🎉 COMPTE LEVEL UP !</h3>
                    <p class="small text-warning">Tu gagnes cette carte cadeau :</p>
                    <div style="max-width: 140px; display:inline-block;"><img id="rewardCardImg" src="" class="img-fluid rounded border border-white"></div>
                </div>

                <div id="cardLevelUpChoiceBlock" class="d-none p-3 bg-black border-danger border-4 rounded-3 text-center mb-2">
                    <h4 class="brawl-font text-danger mb-1">⭐ CARTE UPGRADE ! ⭐</h4>
                    <p class="small text-light mb-2" id="lvlUpCardNameTxt">Amélioration définitive :</p>
                    <div class="mb-3 mx-auto" style="max-width: 120px; aspect-ratio: 5/7; border: 3px solid var(--brawl-yellow); border-radius: 8px; overflow: hidden;"><img id="lvlUpCardPreviewImg" src="" style="width: 100%; height: 100%; object-fit: contain;"></div>
                    <div class="d-flex gap-3 justify-content-center">
                        <button onclick="envoyerUpgradeChoix('atq')" class="btn brawl-btn btn-orange px-3 py-1 fs-6">⚔️ +1 ATTAQUE</button>
                        <button onclick="envoyerUpgradeChoix('pv')" class="btn brawl-btn btn-green px-3 py-1 fs-6">🩸 +2 PV</button>
                    </div>
                </div>

                <div class="d-flex flex-column gap-2 w-100 mt-2">
                    <button id="btnLobbyQuit" onclick="recommencerNouvellePartie()" class="btn brawl-btn btn-yellow py-3 px-5 w-100" disabled>RETOUR AU MENU 🕹️</button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODALE DEMANDE DE MATCH REVANCHE -->
<div class="modal fade" id="rematchRequestModal" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark border-warning p-4 text-center text-white" style="border: 5px solid var(--brawl-yellow); border-radius:25px;">
            <h3 class="brawl-font text-warning mb-2">MATCH REVANCHE !</h3>
            <p class="fs-5 mb-4">Ton adversaire te propose de rejouer avec le même deck ! Acceptes-tu le duel ?</p>
            <div class="d-flex gap-3 justify-content-center">
                <button onclick="repondreRematch(true)" class="btn brawl-btn btn-green px-4 py-2">OUI ⚔️</button>
                <button onclick="repondreRematch(false)" class="btn brawl-btn btn-pink px-4 py-2">NON 🚪</button>
            </div>
        </div>
    </div>
</div>

<!-- MODALE D'INFORMATION DES POUVOIRS [ i ] -->
<div class="modal fade" id="infoPouvoirsModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content bg-dark border-warning p-4 text-white" style="border: 5px solid var(--brawl-yellow); border-radius:25px;">
            <div class="modal-header border-0 pb-0">
                <h3 class="brawl-font text-warning mb-0">📖 GUIDE DES POUVOIRS</h3>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-start small">
                <p class="text-muted mb-3">Voici la description de tous les pouvoirs de l'arène attribués au hasard pour le match :</p>
                <div class="mb-3 p-2 bg-black/40 rounded border border-secondary">
                    <strong class="text-warning">💥 Dernier Souffle :</strong> Ta carte gagne un boost de 25% de ses PV totaux et de ses attaques pendant 2 tours.
                </div>
                <div class="mb-3 p-2 bg-black/40 rounded border border-secondary">
                    <strong class="text-warning">⚡ Vif d'or / Esquive :</strong> Prépare une esquive à 75% de réussite. Si elle réussit, l'attaque ennemie (ou les 2 coups en rafale) rebondit sur l'adversaire et c'est à toi de rejouer !
                </div>
                <div class="mb-3 p-2 bg-black/40 rounded border border-secondary">
                    <strong class="text-warning">🩹 À l'agonie :</strong> La carte en jeu ne peut pas être mise K.O. avant d'avoir atteint 1 PV, mais subit un malus de -25% d'attaque.
                </div>
                <div class="mb-3 p-2 bg-black/40 rounded border border-secondary">
                    <strong class="text-warning">✨ Soins :</strong> Soigne instantanément ta carte actuelle de 50% de ses PV totaux.
                </div>
                <div class="mb-3 p-2 bg-black/40 rounded border border-secondary">
                    <strong class="text-warning">🔄 Switch :</strong> Intervertit immédiatement ta carte actuelle avec celle de ton adversaire.
                </div>
                <div class="mb-3 p-2 bg-black/40 rounded border border-secondary">
                    <strong class="text-warning">💀 Outre Tombe :</strong> Fait revivre une carte K.O., mais toutes tes cartes subissent un malus permanent de -25% de PV et d'attaque.
                </div>
                <div class="mb-3 p-2 bg-black/40 rounded border border-secondary">
                    <strong class="text-warning">💥 En Rafale :</strong> Attaque 2 fois de suite pendant ton tour, mais ton prochain tour est sauté.
                </div>
                <div class="mb-3 p-2 bg-black/40 rounded border border-secondary">
                    <strong class="text-warning">⚡ Méga Attaque :</strong> Inflige une frappe colossale (+50% de dégâts), mais fait passer ton prochain tour et réduit l'attaque de tes autres cartes de 25%.
                </div>
            </div>
            <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn brawl-btn btn-yellow w-100 py-2" data-bs-dismiss="modal">COMPRIS ! 🕹️</button>
            </div>
        </div>
    </div>
</div>

    <!-- CHARGEMENT DES FICHIERS JS -->
    <script src="multiplayer.js"></script>
    <script src="pouvoir.js"></script>
    <script src="combathorsligne.js"></script>
</body>
</html>
