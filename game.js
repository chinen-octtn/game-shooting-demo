import * as THREE from 'three';

let camera, scene, renderer;
let player;
let bullets = [];
let enemies = [];
let score = 0;
let life = 3;
let isGameOver = false;
let lastShootTime = 0;  // 最後に発射した時間を記録
let enemySpawnInterval = 2000;  // 敵の生成間隔（ミリ秒）
let enemySpawnTimer;           // 敵生成のタイマー
let difficultyTimer;          // 難易度上昇のタイマー
let isInvincible = false;        // 無敵状態かどうか
let invincibleTimer = null;      // 無敵時間のタイマー
let blinkInterval = null;        // 点滅用のタイマー

// プレイヤーの無敵モード開始
function startInvincibility() {
    if (isInvincible) return;
    
    isInvincible = true;
    let isVisible = true;
    
    // 点滅エフェクト（0.1秒ごとに表示/非表示を切り替え）
    blinkInterval = setInterval(() => {
        player.visible = isVisible;
        isVisible = !isVisible;
    }, 100);
    
    // 1秒後に無敵解除
    invincibleTimer = setTimeout(() => {
        isInvincible = false;
        clearInterval(blinkInterval);
        player.visible = true;  // 必ず表示状態で終了
    }, 1000);
}

// ゲームのリセット
function resetGame() {
    score = 0;
    life = 3;
    isGameOver = false;
    isInvincible = false;
    enemySpawnInterval = 2000;
    
    // 点滅エフェクトをクリア
    if (blinkInterval) clearInterval(blinkInterval);
    if (invincibleTimer) clearTimeout(invincibleTimer);
    player.visible = true;
    
    // スコアとライフの表示をリセット
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('lifeValue').textContent = life;
    
    // 敵と弾を全て削除
    enemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    enemies = [];
    bullets = [];
    
    // プレイヤーの位置をリセット
    player.position.set(0, 0, 0);
    
    // ゲームオーバー画面を非表示
    document.getElementById('game-over').style.display = 'none';

    // タイマーをクリアして再設定
    clearInterval(enemySpawnTimer);
    clearInterval(difficultyTimer);
    startGameTimers();
}

// ゲームタイマーの開始
function startGameTimers() {
    // 敵の生成タイマー
    enemySpawnTimer = setInterval(createEnemy, enemySpawnInterval);

    // 10秒ごとに難易度を上げるタイマー
    difficultyTimer = setInterval(() => {
        enemySpawnInterval = Math.max(200, enemySpawnInterval / 2);  // 最小間隔は200ミリ秒
        clearInterval(enemySpawnTimer);
        enemySpawnTimer = setInterval(createEnemy, enemySpawnInterval);
    }, 10000);
}

// ゲームオーバー処理
function gameOver() {
    isGameOver = true;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('game-over').style.display = 'flex';
    
    // タイマーを停止
    clearInterval(enemySpawnTimer);
    clearInterval(difficultyTimer);
}

// ペットボトルの形状を作成する関数
function createBottleGeometry() {
    const group = new THREE.Group();
    
    // ボトルの本体（円柱）
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x87CEEB,  // 水色
        transparent: true,
        opacity: 0.8,     // 半透明
        shininess: 100    // 光沢を強く
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // ボトルの首部分（細い円柱）
    const neckGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 16);
    const neck = new THREE.Mesh(neckGeometry, bodyMaterial);
    neck.position.y = 0.65;
    group.add(neck);
    
    // キャップ部分
    const capGeometry = new THREE.CylinderGeometry(0.17, 0.17, 0.1, 16);
    const capMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4169E1,  // 濃い青
        shininess: 50
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.85;
    group.add(cap);
    
    // ボトル全体を少し傾ける
    group.rotation.z = Math.PI * 0.1;  // 約18度傾ける
    
    return group;
}

// ゲームの初期化
function init() {
    // シーンの作成
    scene = new THREE.Scene();

    // カメラの設定
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 2;

    // レンダラーの設定
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // プレイヤーの作成
    const geometry = new THREE.BoxGeometry(1, 0.5, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    player = new THREE.Mesh(geometry, material);
    player.position.y = 0;
    scene.add(player);

    // 光源の追加
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // 地面の追加
    const groundGeometry = new THREE.PlaneGeometry(100, 1000);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    scene.add(ground);

    // イベントリスナーの設定
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', shoot);

    // タイマーの開始
    startGameTimers();

    // リスタートボタンのイベントリスナーを追加
    document.getElementById('restartButton').addEventListener('click', resetGame);
}

// キー入力の処理
const keys = {};
function onKeyDown(event) {
    keys[event.key] = true;
}

function onKeyUp(event) {
    keys[event.key] = false;
}

// 弾の発射
function shoot() {
    const currentTime = Date.now();
    if (currentTime - lastShootTime < 300) {  // 0.3秒（300ミリ秒）経過していなければ発射しない
        return;
    }
    
    const bulletGeometry = new THREE.SphereGeometry(0.1);
    const bulletMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xf0f0f0,     // 明るい白色
        emissive: 0x404040,  // 自己発光効果を追加
        shininess: 100,      // 光沢を強く
        specular: 0xffffff   // 反射光を白く
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(player.position);
    bullet.position.y += 0.25;
    scene.add(bullet);
    bullets.push(bullet);
    
    lastShootTime = currentTime;  // 発射時間を更新
}

// トマトの形状を作成する関数
function createTomatoGeometry() {
    const group = new THREE.Group();
    
    // トマトの本体（球体）
    const tomatoGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const tomatoMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff3b3b,  // より鮮やかな赤色
        shininess: 100    // つやっぽい見た目に
    });
    const tomato = new THREE.Mesh(tomatoGeometry, tomatoMaterial);
    group.add(tomato);
    
    // ヘタの中心部分（円錐）
    const calyxBaseGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.1, 5);
    const calyxMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 });
    const calyxBase = new THREE.Mesh(calyxBaseGeometry, calyxMaterial);
    calyxBase.position.y = 0.5;
    group.add(calyxBase);
    
    // ヘタの葉（5枚）
    const leafGeometry = new THREE.ConeGeometry(0.15, 0.2, 3);
    const leafMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 });
    
    for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.y = 0.5;
        leaf.rotation.y = (i * Math.PI * 2) / 5;  // 円周上に均等に配置
        leaf.rotation.x = Math.PI / 3;  // 外側に傾ける
        leaf.position.x = Math.sin(i * Math.PI * 2 / 5) * 0.2;
        leaf.position.z = Math.cos(i * Math.PI * 2 / 5) * 0.2;
        group.add(leaf);
    }
    
    return group;
}

// 敵の生成
function createEnemy() {
    const enemy = createTomatoGeometry();
    enemy.position.z = -30;
    enemy.position.x = Math.random() * 10 - 5;
    enemy.position.y = Math.random() * 5;
    
    // 回転速度を設定
    enemy.userData = {
        rotationSpeed: {
            x: (Math.random() - 0.5) * 0.05,  // -0.025から0.025の範囲
            y: (Math.random() - 0.5) * 0.05,
            z: (Math.random() - 0.5) * 0.05
        }
    };
    
    scene.add(enemy);
    enemies.push(enemy);
}

// ゲームの更新
function update() {
    if (isGameOver) return;  // ゲームオーバー時は更新しない
    
    // プレイヤーの移動
    if (keys['ArrowLeft']) player.position.x -= 0.1;
    if (keys['ArrowRight']) player.position.x += 0.1;
    if (keys['ArrowUp']) player.position.y += 0.1;
    if (keys['ArrowDown']) player.position.y -= 0.1;
    if (keys[' ']) shoot();  // スペースキーで発射
    
    // プレイヤーの位置制限
    player.position.x = Math.max(-5, Math.min(5, player.position.x));
    player.position.y = Math.max(0, Math.min(5, player.position.y));

    // 弾の移動
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].position.z -= 0.5;
        if (bullets[i].position.z < -50) {
            scene.remove(bullets[i]);
            bullets.splice(i, 1);
        }
    }

    // 敵の移動と衝突判定
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].position.z += 0.2;
        
        // 3軸での回転を適用
        const speed = enemies[i].userData.rotationSpeed;
        enemies[i].rotation.x += speed.x;
        enemies[i].rotation.y += speed.y;
        enemies[i].rotation.z += speed.z;
        
        // プレイヤーとの衝突判定（無敵時間中は無視）
        if (!isInvincible && player.position.distanceTo(enemies[i].position) < 1) {
            scene.remove(enemies[i]);
            enemies.splice(i, 1);
            life--;
            document.getElementById('lifeValue').textContent = life;
            
            if (life <= 0) {
                gameOver();
                return;
            }
            
            startInvincibility();
            continue;
        }
        
        // 弾との衝突判定
        bullets.forEach((bullet, bulletIndex) => {
            if (bullet.position.distanceTo(enemies[i].position) < 1) {
                scene.remove(enemies[i]);
                scene.remove(bullet);
                enemies.splice(i, 1);
                bullets.splice(bulletIndex, 1);
                score += 100;
                document.getElementById('scoreValue').textContent = score;
                return;
            }
        });

        // 画面外に出た敵の削除
        if (enemies[i] && enemies[i].position.z > 10) {
            scene.remove(enemies[i]);
            enemies.splice(i, 1);
        }
    }
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// ウィンドウリサイズ時の処理
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ゲーム開始
init();
animate(); 