'use strict';
/* ============ Utilidades ============ */
let pipWin = null; // ventana flotante (Document Picture-in-Picture o ventana emergente)
const DESK = (typeof window !== 'undefined' && window.auroraDesktop) || null; // presente solo dentro de la app de escritorio de Windows
if (DESK) document.body.classList.add('desk');
// App de Android (APK): puente nativo para la notificación con controles y la reproducción con la pantalla apagada
const AND = window.AuroraAndroid || null;
if (AND) document.body.classList.add('android');
const $ = (s, r = document) => r.querySelector(s);
// Sin raíz: busca en la ventana principal y en la flotante (si existe)
const $$ = (s, r) => r ? [...r.querySelectorAll(s)] : [...document.querySelectorAll(s), ...(pipWin ? pipWin.document.querySelectorAll(s) : [])];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { if (!isFinite(s)) return '0:00'; s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ============ Idiomas ============ */
const LANGS = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano', ja: '日本語', ar: 'العربية' };
const I18N = {
  en: { lib: 'Library', pls: 'Playlists', now: 'Player', set: 'Customize', import: 'Import music', url: 'Add link', search: 'Search…', empty: 'Nothing here yet. Import your music files to start.', newpl: 'New playlist', playall: 'Play', lang: 'Language', skin: 'Player style', s1: 'Modern', s2: 'Turntable', s3: 'MP3 player', accent: 'Accent color', theme: 'Theme', dark: 'Dark', light: 'Light', font: 'Font', fontup: 'Upload font', bg: 'Background', bg0: 'None', bg1: 'Color', bg2: 'Image / GIF', bg3: 'Video', bg4: 'Link', choose: 'Choose file', dim: 'Dimming', blur: 'Blur', anim: 'Animations', trans: 'Transitions', t1: 'Fade', t2: 'Slide', t3: 'Zoom', t4: 'None', vis: 'Equalizer animation', addpl: 'Add to playlist', cover: 'Change cover', del: 'Delete', ren: 'Rename', nothing: 'Nothing playing', tracks: 'songs', cancel: 'Cancel', ok: 'OK', ttl: 'Title', art: 'Artist', name: 'Name', install: 'Install app', rm: 'Remove from playlist', link: 'Link (https://…)', added: 'Added', noplay: 'Add music first' },
  es: { lib: 'Biblioteca', pls: 'Playlists', now: 'Reproductor', set: 'Personalizar', import: 'Importar música', url: 'Añadir enlace', search: 'Buscar…', empty: 'Aún no hay nada. Importa tus archivos de música para empezar.', newpl: 'Nueva playlist', playall: 'Reproducir', lang: 'Idioma', skin: 'Estilo del reproductor', s1: 'Moderno', s2: 'Tocadiscos', s3: 'Reproductor MP3', accent: 'Color de acento', theme: 'Tema', dark: 'Oscuro', light: 'Claro', font: 'Tipo de letra', fontup: 'Subir fuente', bg: 'Fondo', bg0: 'Ninguno', bg1: 'Color', bg2: 'Imagen / GIF', bg3: 'Video', bg4: 'Enlace', choose: 'Elegir archivo', dim: 'Oscurecer', blur: 'Desenfoque', anim: 'Animaciones', trans: 'Transiciones', t1: 'Desvanecer', t2: 'Deslizar', t3: 'Zoom', t4: 'Ninguna', vis: 'Animación de ecualizador', addpl: 'Añadir a playlist', cover: 'Cambiar portada', del: 'Eliminar', ren: 'Renombrar', nothing: 'Nada en reproducción', tracks: 'canciones', cancel: 'Cancelar', ok: 'Aceptar', ttl: 'Título', art: 'Artista', name: 'Nombre', install: 'Instalar app', rm: 'Quitar de la playlist', link: 'Enlace (https://…)', added: 'Añadido', noplay: 'Primero agrega música' },
  pt: { lib: 'Biblioteca', pls: 'Playlists', now: 'Player', set: 'Personalizar', import: 'Importar músicas', url: 'Adicionar link', search: 'Buscar…', empty: 'Nada por aqui ainda. Importe seus arquivos de música para começar.', newpl: 'Nova playlist', playall: 'Reproduzir', lang: 'Idioma', skin: 'Estilo do player', s1: 'Moderno', s2: 'Toca-discos', s3: 'Player MP3', accent: 'Cor de destaque', theme: 'Tema', dark: 'Escuro', light: 'Claro', font: 'Fonte', fontup: 'Enviar fonte', bg: 'Fundo', bg0: 'Nenhum', bg1: 'Cor', bg2: 'Imagem / GIF', bg3: 'Vídeo', bg4: 'Link', choose: 'Escolher arquivo', dim: 'Escurecer', blur: 'Desfoque', anim: 'Animações', trans: 'Transições', t1: 'Esmaecer', t2: 'Deslizar', t3: 'Zoom', t4: 'Nenhuma', vis: 'Animação do equalizador', addpl: 'Adicionar à playlist', cover: 'Mudar capa', del: 'Excluir', ren: 'Renomear', nothing: 'Nada tocando', tracks: 'músicas', cancel: 'Cancelar', ok: 'OK', ttl: 'Título', art: 'Artista', name: 'Nome', install: 'Instalar app', rm: 'Remover da playlist', link: 'Link (https://…)', added: 'Adicionado', noplay: 'Adicione músicas primeiro' },
  fr: { lib: 'Bibliothèque', pls: 'Playlists', now: 'Lecteur', set: 'Personnaliser', import: 'Importer de la musique', url: 'Ajouter un lien', search: 'Rechercher…', empty: 'Rien pour le moment. Importez vos fichiers musicaux pour commencer.', newpl: 'Nouvelle playlist', playall: 'Lire', lang: 'Langue', skin: 'Style du lecteur', s1: 'Moderne', s2: 'Platine vinyle', s3: 'Lecteur MP3', accent: "Couleur d'accent", theme: 'Thème', dark: 'Sombre', light: 'Clair', font: 'Police', fontup: 'Importer une police', bg: 'Arrière-plan', bg0: 'Aucun', bg1: 'Couleur', bg2: 'Image / GIF', bg3: 'Vidéo', bg4: 'Lien', choose: 'Choisir un fichier', dim: 'Assombrir', blur: 'Flou', anim: 'Animations', trans: 'Transitions', t1: 'Fondu', t2: 'Glissement', t3: 'Zoom', t4: 'Aucune', vis: "Animation de l'égaliseur", addpl: 'Ajouter à une playlist', cover: 'Changer la pochette', del: 'Supprimer', ren: 'Renommer', nothing: 'Aucune lecture', tracks: 'titres', cancel: 'Annuler', ok: 'OK', ttl: 'Titre', art: 'Artiste', name: 'Nom', install: "Installer l'app", rm: 'Retirer de la playlist', link: 'Lien (https://…)', added: 'Ajouté', noplay: "Ajoutez d'abord de la musique" },
  de: { lib: 'Bibliothek', pls: 'Playlists', now: 'Player', set: 'Anpassen', import: 'Musik importieren', url: 'Link hinzufügen', search: 'Suchen…', empty: 'Noch nichts da. Importiere deine Musikdateien, um zu starten.', newpl: 'Neue Playlist', playall: 'Abspielen', lang: 'Sprache', skin: 'Player-Stil', s1: 'Modern', s2: 'Plattenspieler', s3: 'MP3-Player', accent: 'Akzentfarbe', theme: 'Design', dark: 'Dunkel', light: 'Hell', font: 'Schriftart', fontup: 'Schrift hochladen', bg: 'Hintergrund', bg0: 'Keiner', bg1: 'Farbe', bg2: 'Bild / GIF', bg3: 'Video', bg4: 'Link', choose: 'Datei wählen', dim: 'Abdunkeln', blur: 'Unschärfe', anim: 'Animationen', trans: 'Übergänge', t1: 'Einblenden', t2: 'Schieben', t3: 'Zoom', t4: 'Keine', vis: 'Equalizer-Animation', addpl: 'Zur Playlist hinzufügen', cover: 'Cover ändern', del: 'Löschen', ren: 'Umbenennen', nothing: 'Keine Wiedergabe', tracks: 'Titel', cancel: 'Abbrechen', ok: 'OK', ttl: 'Titel', art: 'Künstler', name: 'Name', install: 'App installieren', rm: 'Aus Playlist entfernen', link: 'Link (https://…)', added: 'Hinzugefügt', noplay: 'Zuerst Musik hinzufügen' },
  it: { lib: 'Libreria', pls: 'Playlist', now: 'Player', set: 'Personalizza', import: 'Importa musica', url: 'Aggiungi link', search: 'Cerca…', empty: 'Ancora niente. Importa i tuoi file musicali per iniziare.', newpl: 'Nuova playlist', playall: 'Riproduci', lang: 'Lingua', skin: 'Stile del player', s1: 'Moderno', s2: 'Giradischi', s3: 'Lettore MP3', accent: 'Colore principale', theme: 'Tema', dark: 'Scuro', light: 'Chiaro', font: 'Carattere', fontup: 'Carica font', bg: 'Sfondo', bg0: 'Nessuno', bg1: 'Colore', bg2: 'Immagine / GIF', bg3: 'Video', bg4: 'Link', choose: 'Scegli file', dim: 'Oscura', blur: 'Sfocatura', anim: 'Animazioni', trans: 'Transizioni', t1: 'Dissolvenza', t2: 'Scorrimento', t3: 'Zoom', t4: 'Nessuna', vis: 'Animazione equalizzatore', addpl: 'Aggiungi alla playlist', cover: 'Cambia copertina', del: 'Elimina', ren: 'Rinomina', nothing: 'Nessuna riproduzione', tracks: 'brani', cancel: 'Annulla', ok: 'OK', ttl: 'Titolo', art: 'Artista', name: 'Nome', install: "Installa l'app", rm: 'Rimuovi dalla playlist', link: 'Link (https://…)', added: 'Aggiunto', noplay: 'Aggiungi prima della musica' },
  ja: { lib: 'ライブラリ', pls: 'プレイリスト', now: 'プレーヤー', set: 'カスタマイズ', import: '音楽をインポート', url: 'リンクを追加', search: '検索…', empty: 'まだ何もありません。音楽ファイルをインポートしてください。', newpl: '新規プレイリスト', playall: '再生', lang: '言語', skin: 'プレーヤーのスタイル', s1: 'モダン', s2: 'ターンテーブル', s3: 'MP3プレーヤー', accent: 'アクセントカラー', theme: 'テーマ', dark: 'ダーク', light: 'ライト', font: 'フォント', fontup: 'フォントをアップロード', bg: '背景', bg0: 'なし', bg1: '色', bg2: '画像 / GIF', bg3: '動画', bg4: 'リンク', choose: 'ファイルを選択', dim: '暗さ', blur: 'ぼかし', anim: 'アニメーション', trans: 'トランジション', t1: 'フェード', t2: 'スライド', t3: 'ズーム', t4: 'なし', vis: 'イコライザーの動き', addpl: 'プレイリストに追加', cover: 'カバーを変更', del: '削除', ren: '名前を変更', nothing: '再生していません', tracks: '曲', cancel: 'キャンセル', ok: 'OK', ttl: 'タイトル', art: 'アーティスト', name: '名前', install: 'アプリをインストール', rm: 'プレイリストから削除', link: 'リンク (https://…)', added: '追加しました', noplay: '先に音楽を追加してください' },
  ar: { lib: 'المكتبة', pls: 'قوائم التشغيل', now: 'المشغّل', set: 'تخصيص', import: 'استيراد الموسيقى', url: 'إضافة رابط', search: 'بحث…', empty: 'لا يوجد شيء بعد. استورد ملفات الموسيقى للبدء.', newpl: 'قائمة تشغيل جديدة', playall: 'تشغيل', lang: 'اللغة', skin: 'شكل المشغّل', s1: 'عصري', s2: 'مشغّل أسطوانات', s3: 'مشغّل MP3', accent: 'لون التمييز', theme: 'المظهر', dark: 'داكن', light: 'فاتح', font: 'الخط', fontup: 'رفع خط', bg: 'الخلفية', bg0: 'بدون', bg1: 'لون', bg2: 'صورة / GIF', bg3: 'فيديو', bg4: 'رابط', choose: 'اختر ملفًا', dim: 'التعتيم', blur: 'التمويه', anim: 'الحركات', trans: 'الانتقالات', t1: 'تلاشي', t2: 'انزلاق', t3: 'تكبير', t4: 'بدون', vis: 'حركة المعادل', addpl: 'إضافة إلى قائمة', cover: 'تغيير الغلاف', del: 'حذف', ren: 'إعادة تسمية', nothing: 'لا شيء قيد التشغيل', tracks: 'أغنية', cancel: 'إلغاء', ok: 'موافق', ttl: 'العنوان', art: 'الفنان', name: 'الاسم', install: 'تثبيت التطبيق', rm: 'إزالة من القائمة', link: 'رابط (https://…)', added: 'تمت الإضافة', noplay: 'أضف موسيقى أولاً' }
};
/* Textos nuevos de la versión 2.0 (los idiomas sin traducción caen en inglés) */
const I18N2 = {
  en: { decor: 'Decorate', done: 'Done', mini: 'Floating mini player', miniNote: 'Playing in the floating window', miniBack: 'Bring back', stk: 'Stickers', stkImg: 'Image / GIF', stkEmo: 'Emoji', stkTxt: 'Text', stkTxtAsk: 'Sticker text', stkTip: 'Drag a sticker to move it. Tap one to resize, rotate or change its color.', front: 'To front', color: 'Color', bodyc: 'Body color', auto: 'Match accent color', lcd: 'Screen', l1: 'Green', l2: 'Amber', l3: 'Blue', l4: 'Night', finish: 'Finish', f1: 'Glossy', f2: 'Matte', f3: 'Metal', wood: 'Base', w1: 'Walnut', w2: 'Black', w3: 'White', vinyl: 'Record', v1: 'Black', v2: 'Red', v3: 'Blue', v4: 'Clear', v5: 'Splatter', lid: 'Dust cover', strobe: 'Strobe ring', led: 'Power light', rpm: 'Speed (RPM)', shape: 'Cover shape', sh1: 'Square', sh2: 'Rounded', sh3: 'Circle', aura: 'Glow', react: 'React to the music', nopip: 'This browser can’t open a floating window. Allow pop-ups or use Edge/Chrome on desktop.', ver: 'Version', updated: 'App updated' },
  es: { decor: 'Decorar', done: 'Listo', mini: 'Mini reproductor flotante', miniNote: 'Sonando en la ventana flotante', miniBack: 'Traer de vuelta', stk: 'Stickers', stkImg: 'Imagen / GIF', stkEmo: 'Emoji', stkTxt: 'Texto', stkTxtAsk: 'Texto del sticker', stkTip: 'Arrastra un sticker para moverlo. Tócalo para cambiar tamaño, girarlo o cambiar su color.', front: 'Al frente', color: 'Color', bodyc: 'Color del cuerpo', auto: 'Usar color de acento', lcd: 'Pantalla', l1: 'Verde', l2: 'Ámbar', l3: 'Azul', l4: 'Noche', finish: 'Acabado', f1: 'Brillante', f2: 'Mate', f3: 'Metal', wood: 'Base', w1: 'Nogal', w2: 'Negro', w3: 'Blanco', vinyl: 'Disco', v1: 'Negro', v2: 'Rojo', v3: 'Azul', v4: 'Transparente', v5: 'Salpicado', lid: 'Tapa de cristal', strobe: 'Anillo estroboscópico', led: 'Luz de encendido', rpm: 'Velocidad (RPM)', shape: 'Forma de portada', sh1: 'Cuadrada', sh2: 'Redondeada', sh3: 'Círculo', aura: 'Brillo', react: 'Reaccionar a la música', nopip: 'Este navegador no puede abrir una ventana flotante. Permite las ventanas emergentes o usa Edge/Chrome en computadora.', ver: 'Versión', updated: 'App actualizada' },
  pt: { decor: 'Decorar', done: 'Pronto', mini: 'Mini player flutuante', miniNote: 'Tocando na janela flutuante', miniBack: 'Trazer de volta', stk: 'Stickers', stkImg: 'Imagem / GIF', stkEmo: 'Emoji', stkTxt: 'Texto', stkTxtAsk: 'Texto do sticker', stkTip: 'Arraste um sticker para mover. Toque nele para redimensionar, girar ou mudar a cor.', front: 'Para a frente', color: 'Cor', bodyc: 'Cor do corpo', auto: 'Usar cor de destaque', lcd: 'Tela', l1: 'Verde', l2: 'Âmbar', l3: 'Azul', l4: 'Noite', finish: 'Acabamento', f1: 'Brilhante', f2: 'Fosco', f3: 'Metal', wood: 'Base', w1: 'Nogueira', w2: 'Preto', w3: 'Branco', vinyl: 'Disco', v1: 'Preto', v2: 'Vermelho', v3: 'Azul', v4: 'Transparente', v5: 'Respingado', lid: 'Tampa de vidro', strobe: 'Anel estroboscópico', led: 'Luz de energia', rpm: 'Velocidade (RPM)', shape: 'Formato da capa', sh1: 'Quadrada', sh2: 'Arredondada', sh3: 'Círculo', aura: 'Brilho', react: 'Reagir à música', nopip: 'Este navegador não consegue abrir uma janela flutuante. Permita pop-ups ou use Edge/Chrome no computador.', ver: 'Versão', updated: 'App atualizado' },
  fr: { decor: 'Décorer', done: 'Terminé', mini: 'Mini-lecteur flottant', miniNote: 'Lecture dans la fenêtre flottante', miniBack: 'Ramener ici', stk: 'Stickers', stkImg: 'Image / GIF', stkEmo: 'Emoji', stkTxt: 'Texte', stkTxtAsk: 'Texte du sticker', stkTip: 'Faites glisser un sticker pour le déplacer. Touchez-le pour le redimensionner, le tourner ou changer sa couleur.', front: 'Au premier plan', color: 'Couleur', bodyc: 'Couleur du boîtier', auto: "Utiliser la couleur d'accent", lcd: 'Écran', l1: 'Vert', l2: 'Ambre', l3: 'Bleu', l4: 'Nuit', finish: 'Finition', f1: 'Brillant', f2: 'Mat', f3: 'Métal', wood: 'Socle', w1: 'Noyer', w2: 'Noir', w3: 'Blanc', vinyl: 'Disque', v1: 'Noir', v2: 'Rouge', v3: 'Bleu', v4: 'Transparent', v5: 'Éclaboussures', lid: 'Capot en verre', strobe: 'Anneau stroboscopique', led: "Voyant d'alimentation", rpm: 'Vitesse (tr/min)', shape: 'Forme de la pochette', sh1: 'Carrée', sh2: 'Arrondie', sh3: 'Cercle', aura: 'Halo', react: 'Réagir à la musique', nopip: "Ce navigateur ne peut pas ouvrir de fenêtre flottante. Autorisez les pop-ups ou utilisez Edge/Chrome sur ordinateur.", ver: 'Version', updated: 'Application mise à jour' },
  de: { decor: 'Dekorieren', done: 'Fertig', mini: 'Schwebender Mini-Player', miniNote: 'Läuft im schwebenden Fenster', miniBack: 'Zurückholen', stk: 'Sticker', stkImg: 'Bild / GIF', stkEmo: 'Emoji', stkTxt: 'Text', stkTxtAsk: 'Sticker-Text', stkTip: 'Sticker ziehen zum Verschieben. Antippen zum Skalieren, Drehen oder Umfärben.', front: 'Nach vorn', color: 'Farbe', bodyc: 'Gehäusefarbe', auto: 'Akzentfarbe verwenden', lcd: 'Display', l1: 'Grün', l2: 'Bernstein', l3: 'Blau', l4: 'Nacht', finish: 'Oberfläche', f1: 'Glänzend', f2: 'Matt', f3: 'Metall', wood: 'Sockel', w1: 'Nussbaum', w2: 'Schwarz', w3: 'Weiß', vinyl: 'Schallplatte', v1: 'Schwarz', v2: 'Rot', v3: 'Blau', v4: 'Transparent', v5: 'Gespritzt', lid: 'Staubschutzhaube', strobe: 'Stroboskopring', led: 'Betriebsleuchte', rpm: 'Geschwindigkeit (U/min)', shape: 'Coverform', sh1: 'Quadratisch', sh2: 'Abgerundet', sh3: 'Kreis', aura: 'Leuchten', react: 'Auf Musik reagieren', nopip: 'Dieser Browser kann kein schwebendes Fenster öffnen. Pop-ups erlauben oder Edge/Chrome am Computer nutzen.', ver: 'Version', updated: 'App aktualisiert' },
  it: { decor: 'Decora', done: 'Fatto', mini: 'Mini player flottante', miniNote: 'In riproduzione nella finestra flottante', miniBack: 'Riporta qui', stk: 'Sticker', stkImg: 'Immagine / GIF', stkEmo: 'Emoji', stkTxt: 'Testo', stkTxtAsk: 'Testo dello sticker', stkTip: 'Trascina uno sticker per spostarlo. Toccalo per ridimensionarlo, ruotarlo o cambiarne il colore.', front: 'In primo piano', color: 'Colore', bodyc: 'Colore del corpo', auto: 'Usa il colore principale', lcd: 'Schermo', l1: 'Verde', l2: 'Ambra', l3: 'Blu', l4: 'Notte', finish: 'Finitura', f1: 'Lucido', f2: 'Opaco', f3: 'Metallo', wood: 'Base', w1: 'Noce', w2: 'Nero', w3: 'Bianco', vinyl: 'Disco', v1: 'Nero', v2: 'Rosso', v3: 'Blu', v4: 'Trasparente', v5: 'Schizzato', lid: 'Coperchio di vetro', strobe: 'Anello stroboscopico', led: 'Luce di accensione', rpm: 'Velocità (giri/min)', shape: 'Forma copertina', sh1: 'Quadrata', sh2: 'Arrotondata', sh3: 'Cerchio', aura: 'Alone', react: 'Reagisci alla musica', nopip: 'Questo browser non può aprire una finestra flottante. Consenti i pop-up o usa Edge/Chrome su computer.', ver: 'Versione', updated: 'App aggiornata' },
  ja: { decor: 'デコる', done: '完了', mini: 'フローティングミニプレーヤー', miniNote: 'フローティングウィンドウで再生中', miniBack: '戻す', stk: 'ステッカー', stkImg: '画像 / GIF', stkEmo: '絵文字', stkTxt: 'テキスト', stkTxtAsk: 'ステッカーの文字', stkTip: 'ドラッグで移動。タップでサイズ・回転・色を変更できます。', front: '前面へ', color: '色', bodyc: '本体の色', auto: 'アクセントカラーに合わせる', lcd: '画面', l1: 'グリーン', l2: 'アンバー', l3: 'ブルー', l4: 'ナイト', finish: '仕上げ', f1: '光沢', f2: 'マット', f3: 'メタル', wood: 'ベース', w1: 'ウォールナット', w2: 'ブラック', w3: 'ホワイト', vinyl: 'レコード', v1: 'ブラック', v2: 'レッド', v3: 'ブルー', v4: 'クリア', v5: 'スプラッター', lid: 'ダストカバー', strobe: 'ストロボリング', led: '電源ランプ', rpm: '回転数 (RPM)', shape: 'ジャケットの形', sh1: '四角', sh2: '角丸', sh3: '円', aura: 'グロー', react: '音楽に反応', nopip: 'このブラウザではフローティングウィンドウを開けません。ポップアップを許可するか、PCのEdge/Chromeをお使いください。', ver: 'バージョン', updated: 'アプリを更新しました' },
  ar: { decor: 'تزيين', done: 'تم', mini: 'مشغّل مصغّر عائم', miniNote: 'يعمل في النافذة العائمة', miniBack: 'إرجاعه هنا', stk: 'ملصقات', stkImg: 'صورة / GIF', stkEmo: 'إيموجي', stkTxt: 'نص', stkTxtAsk: 'نص الملصق', stkTip: 'اسحب الملصق لتحريكه. المسه لتغيير الحجم أو التدوير أو اللون.', front: 'إلى الأمام', color: 'اللون', bodyc: 'لون الجسم', auto: 'استخدام لون التمييز', lcd: 'الشاشة', l1: 'أخضر', l2: 'عنبري', l3: 'أزرق', l4: 'ليلي', finish: 'اللمسة النهائية', f1: 'لامع', f2: 'مطفي', f3: 'معدني', wood: 'القاعدة', w1: 'جوز', w2: 'أسود', w3: 'أبيض', vinyl: 'الأسطوانة', v1: 'أسود', v2: 'أحمر', v3: 'أزرق', v4: 'شفاف', v5: 'متناثر', lid: 'غطاء زجاجي', strobe: 'حلقة استروبوسكوب', led: 'ضوء التشغيل', rpm: 'السرعة (دورة/د)', shape: 'شكل الغلاف', sh1: 'مربع', sh2: 'مستدير', sh3: 'دائرة', aura: 'توهج', react: 'التفاعل مع الموسيقى', nopip: 'هذا المتصفح لا يستطيع فتح نافذة عائمة. اسمح بالنوافذ المنبثقة أو استخدم Edge/Chrome على الكمبيوتر.', ver: 'الإصدار', updated: 'تم تحديث التطبيق' }
};
for (const l in I18N2) Object.assign(I18N[l], I18N2[l]);
let S;
const T = k => (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;

const I18N_STORE = {
  en: { storeT: 'Storage', storeDisk: 'Saved on your computer in:', storeSaving: 'Saving to your computer…', storeFail: 'Could not write to your computer. Your data is still safe in the browser.', storeBrowser: 'Saved only in this browser. It can be lost if you clear site data or open the app from a different address.', storeBrowserP: 'Saved in this browser (protected from automatic cleanup).' },
  es: { storeT: 'Almacenamiento', storeDisk: 'Guardado en tu computadora, en:', storeSaving: 'Guardando en tu computadora…', storeFail: 'No se pudo escribir en tu computadora. Tus datos siguen seguros en el navegador.', storeBrowser: 'Guardado solo en este navegador. Se puede perder si borras los datos del sitio o abres la app desde otra dirección.', storeBrowserP: 'Guardado en este navegador (protegido contra limpieza automática).' },
  pt: { storeT: 'Armazenamento', storeDisk: 'Salvo no seu computador em:', storeSaving: 'Salvando no seu computador…', storeFail: 'Não foi possível gravar no computador. Seus dados continuam seguros no navegador.', storeBrowser: 'Salvo apenas neste navegador. Pode ser perdido se você limpar os dados do site ou abrir o app por outro endereço.', storeBrowserP: 'Salvo neste navegador (protegido contra limpeza automática).' },
  fr: { storeT: 'Stockage', storeDisk: 'Enregistré sur votre ordinateur dans :', storeSaving: 'Enregistrement sur votre ordinateur…', storeFail: "Impossible d'écrire sur votre ordinateur. Vos données restent en sécurité dans le navigateur.", storeBrowser: "Enregistré uniquement dans ce navigateur. Peut être perdu si vous effacez les données du site ou ouvrez l'app depuis une autre adresse.", storeBrowserP: 'Enregistré dans ce navigateur (protégé contre le nettoyage automatique).' },
  de: { storeT: 'Speicher', storeDisk: 'Auf deinem Computer gespeichert in:', storeSaving: 'Wird auf deinem Computer gespeichert…', storeFail: 'Schreiben auf den Computer fehlgeschlagen. Deine Daten sind weiterhin im Browser sicher.', storeBrowser: 'Nur in diesem Browser gespeichert. Kann verloren gehen, wenn du Websitedaten löschst oder die App unter einer anderen Adresse öffnest.', storeBrowserP: 'In diesem Browser gespeichert (vor automatischer Bereinigung geschützt).' },
  it: { storeT: 'Archiviazione', storeDisk: 'Salvato sul tuo computer in:', storeSaving: 'Salvataggio sul computer…', storeFail: 'Impossibile scrivere sul computer. I tuoi dati restano al sicuro nel browser.', storeBrowser: "Salvato solo in questo browser. Può andare perso se cancelli i dati del sito o apri l'app da un altro indirizzo.", storeBrowserP: 'Salvato in questo browser (protetto dalla pulizia automatica).' },
  ja: { storeT: 'ストレージ', storeDisk: 'このパソコンに保存済み：', storeSaving: 'パソコンに保存中…', storeFail: 'パソコンに書き込めませんでした。データはブラウザ内に残っています。', storeBrowser: 'このブラウザ内にのみ保存されています。サイトデータを消去したり、別のアドレスで開くと失われることがあります。', storeBrowserP: 'このブラウザに保存済み（自動クリーンアップから保護）。' },
  ar: { storeT: 'التخزين', storeDisk: 'محفوظ على جهازك في:', storeSaving: 'جارٍ الحفظ على جهازك…', storeFail: 'تعذّرت الكتابة على جهازك. بياناتك ما زالت آمنة في المتصفح.', storeBrowser: 'محفوظ في هذا المتصفح فقط. قد يضيع إذا مسحت بيانات الموقع أو فتحت التطبيق من عنوان آخر.', storeBrowserP: 'محفوظ في هذا المتصفح (محمي من التنظيف التلقائي).' }
};
for (const l of Object.keys(I18N_STORE)) Object.assign(I18N[l], I18N_STORE[l]);
const I18N_W = {
  en: { wSmaller: 'Smaller', wBigger: 'Bigger', wBack: 'Back to main window', wClose: 'Close widget' },
  es: { wSmaller: 'Más pequeño', wBigger: 'Más grande', wBack: 'Volver a la ventana principal', wClose: 'Cerrar widget' },
  pt: { wSmaller: 'Menor', wBigger: 'Maior', wBack: 'Voltar à janela principal', wClose: 'Fechar widget' },
  fr: { wSmaller: 'Plus petit', wBigger: 'Plus grand', wBack: 'Retour à la fenêtre principale', wClose: 'Fermer le widget' },
  de: { wSmaller: 'Kleiner', wBigger: 'Größer', wBack: 'Zurück zum Hauptfenster', wClose: 'Widget schließen' },
  it: { wSmaller: 'Più piccolo', wBigger: 'Più grande', wBack: 'Torna alla finestra principale', wClose: 'Chiudi widget' },
  ja: { wSmaller: '小さく', wBigger: '大きく', wBack: 'メインウィンドウに戻る', wClose: 'ウィジェットを閉じる' },
  ar: { wSmaller: 'أصغر', wBigger: 'أكبر', wBack: 'العودة إلى النافذة الرئيسية', wClose: 'إغلاق الأداة' }
};
for (const l of Object.keys(I18N_W)) Object.assign(I18N[l], I18N_W[l]);

// Textos de la interfaz nueva (archivo lang.js); si no cargara, la app sigue funcionando con los textos base
if (window.I18N_X) for (const l of Object.keys(window.I18N_X)) Object.assign(I18N[l] || (I18N[l] = {}), window.I18N_X[l]);

/* ============ Ajustes ============ */
const FONTS = ['System', 'Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Orbitron', 'Press Start 2P', 'Pacifico', 'Space Mono', 'Dancing Script', 'Bebas Neue'];
const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
const DEF = { lang: (navigator.language || 'en').slice(0, 2), skin: 'modern', theme: 'dark', accent: '#1ed760', font: 'Inter', customFont: null, bgtype: 'none', bgcolor: '#14141c', bgblob: null, bgurl: '', dim: 35, blur: 0, anim: !reduced, trans: 'fade', vis: true, react: true,
  jamendoId: '', ntfSkin: true, lockApp: false, wsize: 100, wfade: true, widle: 45, wsnap: true, ui: 100, radius: 16, panelA: 62, panelB: 14, density: 'normal', fxVig: false, fxGrain: false, immersive: true, speed: 100, stkLib: [],
  look: {
    modern: { shape: 'round', aura: true },
    turntable: { wood: 'walnut', woodColor: '#6b4428', vinyl: 'black', lid: false, strobe: true, led: true, rpm: '33' },
    mp3: { lcd: 'green', finish: 'gloss', auto: true, body: '#c85a5a', cover: true },
    display: { layout: 'clock', art: 'cover', png: null, pngN: null, autoN: true, key: 'off', keyT: 30, fit: 'contain', color: '#ffffff', font: 'Syncopate', lines: true, dim: 25, round: 0, h24: false }
  },
  stickers: { modern: [], turntable: [], mp3: [], display: [], retro: [], cassette: [], cd: [], radio: [] } };
// Fusiona opciones nuevas con las guardadas por versiones anteriores
const normalizeS = saved => {
  const o = { ...JSON.parse(JSON.stringify(DEF)), ...(saved || {}) };
  if (!LANGS[o.lang]) o.lang = 'en';
  o.look = o.look || {};
  for (const k of Object.keys(DEF.look)) o.look[k] = { ...DEF.look[k], ...(o.look[k] || {}) };
  o.stickers = o.stickers || {};
  for (const k of ['modern', 'turntable', 'mp3', 'display', 'retro', 'cassette', 'cd', 'radio']) if (!Array.isArray(o.stickers[k])) o.stickers[k] = [];
  return o;
};
let hadSaved = false;
try { const raw = localStorage.getItem('aurora'); hadSaved = !!raw; S = normalizeS(raw ? JSON.parse(raw) : {}); } catch { S = normalizeS({}); }
let saveT;
const save = () => {
  try { localStorage.setItem('aurora', JSON.stringify(S)); } catch { }
  // Copia en disco (lanzador de Windows): se envía poco después del último cambio
  if (Remote.on) { clearTimeout(saveT); saveT = setTimeout(() => Remote.queue(() => Remote.putSettings(JSON.stringify(S))), 300); }
};

/* ============ Copia en disco (solo con el lanzador de Windows) ============
   El mini servidor local guarda música, portadas, playlists y ajustes en una carpeta
   real (%LOCALAPPDATA%\AuroraMusicData). Así no dependen de que el navegador conserve sus datos. */
const Remote = (() => {
  const H = { 'X-Aurora': '1' };
  let on = false, dir = '', chain = Promise.resolve(), pending = 0, failed = 0;
  const call = async (path, opt = {}) => {
    const r = await fetch('api/' + path, { cache: 'no-store', ...opt, headers: { ...H, ...(opt.headers || {}) } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  };
  return {
    get on() { return on; }, get dir() { return dir; }, get pending() { return pending; }, get failed() { return failed; },
    async init() {
      if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return false;
      try {
        const c = new AbortController(), t = setTimeout(() => c.abort(), 2500);
        const r = await fetch('api/ping', { headers: H, signal: c.signal, cache: 'no-store' }); clearTimeout(t);
        const d = await r.json(); on = !!(d && d.aurora); dir = (d && d.dir) || '';
      } catch { on = false; }
      return on;
    },
    // Cola en orden: evita subir varios archivos grandes a la vez
    queue(fn) {
      pending++;
      chain = chain.then(fn).then(() => { failed = 0; }, () => { failed++; }).then(() => { pending--; refreshStorageUI(); });
      return chain;
    },
    index: () => call('index').then(r => r.json()),
    putRec: (s, o) => call(`rec/${s}/${o.id}`, { method: 'PUT', body: JSON.stringify(o) }),
    delRec: (s, id) => call(`rec/${s}/${id}`, { method: 'DELETE' }),
    putBlob: (id, b) => call(`blob/${id}`, { method: 'PUT', body: b, headers: { 'Content-Type': b.type || 'application/octet-stream' } }),
    getBlob: async id => (await call(`blob/${id}`)).blob(),
    delBlob: id => call(`blob/${id}`, { method: 'DELETE' }),
    putSettings: str => call('settings', { method: 'PUT', body: str, headers: { 'Content-Type': 'application/json' } })
  };
})();

/* ============ IndexedDB ============ */
const DB = (() => {
  let db;
  const open = () => db ? Promise.resolve(db) : new Promise((res, rej) => {
    const r = indexedDB.open('aurora', 1);
    r.onupgradeneeded = () => { ['tracks', 'playlists', 'blobs'].forEach(s => r.result.createObjectStore(s, { keyPath: 'id' })); };
    r.onsuccess = () => { db = r.result; res(db); };
    r.onerror = () => rej(r.error);
  });
  const tx = async (s, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(s, mode); const req = fn(t.objectStore(s));
      t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  };
  const mirror = (s, o) => { if (Remote.on) Remote.queue(() => s === 'blobs' ? Remote.putBlob(o.id, o.blob) : Remote.putRec(s, o)); };
  return {
    all: s => tx(s, 'readonly', st => st.getAll()),
    keys: s => tx(s, 'readonly', st => st.getAllKeys()),
    // Si el archivo no está en el navegador pero sí en el disco, lo recupera
    get: async (s, id) => {
      const r = await tx(s, 'readonly', st => st.get(id));
      if (!r && s === 'blobs' && Remote.on) {
        try { const rec = { id, blob: await Remote.getBlob(id) }; await tx(s, 'readwrite', st => st.put(rec)); return rec; } catch { }
      }
      return r;
    },
    put: async (s, o) => { const r = await tx(s, 'readwrite', st => st.put(o)); mirror(s, o); return r; },
    putLocal: (s, o) => tx(s, 'readwrite', st => st.put(o)),
    del: async (s, id) => {
      const r = await tx(s, 'readwrite', st => st.delete(id));
      if (Remote.on) Remote.queue(() => s === 'blobs' ? Remote.delBlob(id) : Remote.delRec(s, id));
      return r;
    }
  };
})();

// Compara navegador y disco: lo que falte en uno se copia al otro
async function syncDisk(idx) {
  if (!Remote.on || !idx) return;
  for (const store of ['tracks', 'playlists']) {
    const list = idx[store] || [], arr = store === 'tracks' ? tracks : pls;
    const have = new Set(arr.map(x => x.id)), there = new Set(list.map(x => x.id));
    for (const r of list) if (!have.has(r.id)) { await DB.putLocal(store, r); arr.push(r); }
    for (const r of arr) if (!there.has(r.id)) Remote.queue(() => Remote.putRec(store, r));
  }
  const there = new Set(idx.blobs || []);
  for (const id of await DB.keys('blobs')) {
    if (!there.has(id)) Remote.queue(async () => { const r = await DB.get('blobs', id); if (r) await Remote.putBlob(id, r.blob); });
  }
  Remote.queue(() => Remote.putSettings(JSON.stringify(S)));
}
async function refreshStorageUI() {
  const el = document.getElementById('store-status'); if (!el) return;
  let persisted = false;
  try { persisted = !!(navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()); } catch { }
  el.textContent = Remote.on
    ? (Remote.failed ? T('storeFail') : Remote.pending ? T('storeSaving') : T('storeDisk') + ' ' + Remote.dir)
    : (persisted ? T('storeBrowserP') : T('storeBrowser'));
}

const urlCache = new Map();
async function putBlob(blob) { const id = uid(); await DB.put('blobs', { id, blob }); return id; }
async function blobURL(id) {
  if (!id) return null; if (urlCache.has(id)) return urlCache.get(id);
  const r = await DB.get('blobs', id); if (!r) return null;
  const u = URL.createObjectURL(r.blob); urlCache.set(id, u); return u;
}
function dropBlob(id) { if (!id) return; DB.del('blobs', id).catch(() => { }); const u = urlCache.get(id); if (u) { URL.revokeObjectURL(u); urlCache.delete(id); } }

/* ============ Iconos ============ */
const st = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  prev: '<path d="M6 6h2v12H6zM9.5 12 18 6v12z"/>',
  next: '<path d="M16 6h2v12h-2zM14.5 12 6 18V6z"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
  shuffle: `<path ${st} d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>`,
  repeat: `<path ${st} d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>`,
  repeat1: `<path ${st} d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3M11 10l1-1v6"/>`,
  vol: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  plus: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>',
  more: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',
  lib: `<path ${st} d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" ${st}/><circle cx="18" cy="16" r="3" ${st}/>`,
  list: `<path ${st} d="M3 6h13M3 12h13M3 18h8M19 14v7M15.5 17.5h7"/>`,
  clock: `<circle cx="12" cy="12" r="9" ${st}/><path ${st} d="M12 7v5l3 2"/>`,
  disc: `<circle cx="12" cy="12" r="9" ${st}/><circle cx="12" cy="12" r="2.6"/>`,
  gear: `<circle cx="12" cy="12" r="3.2" ${st}/><path ${st} d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>`,
  back: `<path ${st} d="M15 5l-7 7 7 7"/>`,
  brush: `<path ${st} d="M3 21c3 0 5-1 5-4a3 3 0 0 0-3-3c-3 0-2 3-2 7zM8 14 18 4a2 2 0 0 1 3 3L11 17"/>`,
  minus: `<path ${st} d="M6 12h12"/>`,
  close: `<path ${st} d="M6 6l12 12M18 6 6 18"/>`,
  menu: `<path ${st} d="M4 7h16M4 12h16M4 17h16"/>`,
  expand: `<path ${st} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>`,
  vinyl: `<circle cx="12" cy="12" r="9" ${st}/><circle cx="12" cy="12" r="3" ${st}/><path ${st} d="M12 3v2"/>`,
  cassette: `<rect x="3" y="6" width="18" height="12" rx="2" ${st}/><circle cx="9" cy="12" r="2" ${st}/><circle cx="15" cy="12" r="2" ${st}/><path d="M7 16h10" ${st}/>`,
  cdp: `<circle cx="12" cy="12" r="8.5" ${st}/><circle cx="12" cy="12" r="2.2" ${st}/>`,
  radio: `<rect x="3" y="7" width="18" height="12" rx="2" ${st}/><path d="M7 7l9-4" ${st}/><circle cx="16.5" cy="13" r="2.6" ${st}/><path d="M6 11h5M6 14h5" ${st}/>`,
  retro: `<rect x="3" y="5" width="18" height="14" rx="3" ${st}/><rect x="6" y="8" width="12" height="5" rx=".8" ${st}/><circle cx="9" cy="16" r=".6" ${st}/><circle cx="12" cy="16" r=".6" ${st}/><circle cx="15" cy="16" r=".6" ${st}/>`,
  mp3: `<rect x="6" y="2.5" width="12" height="19" rx="3" ${st}/><rect x="8.5" y="5" width="7" height="5" rx="1" ${st}/><circle cx="12" cy="15.5" r="3" ${st}/>`,
  pip: `<rect x="3" y="5" width="18" height="14" rx="2" ${st}/><rect x="12" y="11" width="7" height="6" rx="1"/>`
};
const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const setIco = (el, n) => { el.dataset.ico = n; el.innerHTML = svg(n); };
const hydrate = (root = document) => $$('[data-ico]', root).forEach(e => { e.innerHTML = svg(e.dataset.ico); });

/* ============ Estado ============ */
let tracks = [], pls = [];
let TM = new Map(), PM = new Map();
let curPl = null, view = 'lib', seeking = false;
const P = { queue: [], idx: -1, shuffle: false, repeat: 'off', url: null, token: 0 };
const audio = $('#audio');
const RT = { on: false, tr: null, status: 'none', key: '', sil: null, selfSeek: 0, switching: false, userAt: 0 };
const cur = () => (RT.on && RT.tr) || TM.get(P.queue[P.idx]);
const rebuild = () => { TM = new Map(tracks.map(t => [t.id, t])); PM = new Map(pls.map(p => [p.id, p])); };

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1800); }

/* ============ Portadas ============ */
const covers = new Map(), seedCache = new Map();
function genCover(seed) {
  if (seedCache.has(seed)) return seedCache.get(seed);
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const hue = Math.abs(h) % 360;
  let out = '';
  try {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    if (g) {
      const gr = g.createLinearGradient(0, 0, 256, 256);
      gr.addColorStop(0, `hsl(${hue},70%,55%)`); gr.addColorStop(1, `hsl(${(hue + 60) % 360},70%,25%)`);
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 120px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText((Array.from(seed.trim())[0] || '♪').toUpperCase(), 128, 138);
      out = c.toDataURL('image/png');
    }
  } catch { }
  seedCache.set(seed, out); return out;
}
async function warmCovers() {
  for (const t of tracks) covers.set('t' + t.id, (t.coverId && await blobURL(t.coverId)) || genCover(t.title + t.artist));
  for (const p of pls) {
    const first = TM.get(p.ids[0]);
    covers.set('p' + p.id, (p.coverId && await blobURL(p.coverId)) || (first && covers.get('t' + first.id)) || genCover(p.name));
  }
}

/* ============ Diálogos ============ */
function openDlg(d) { d.returnValue = ''; if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
function pick(title, opts) {
  return new Promise(res => {
    const d = $('#dlg'), f = d.querySelector('form');
    f.innerHTML = `<h3>${esc(title)}</h3><div class="pk">${opts.map((o, i) => `<button type="submit" value="${i}" class="btn ${o.danger ? 'danger' : ''}">${esc(o.label)}</button>`).join('')}</div><button type="submit" value="x" class="btn ghost">${esc(T('cancel'))}</button>`;
    d.onclose = () => { const v = d.returnValue; res(v !== '' && v !== 'x' && opts[+v] ? opts[+v].value : null); };
    openDlg(d);
  });
}
function ask(title, fields, note) {
  return new Promise(res => {
    const d = $('#dlg'), f = d.querySelector('form');
    f.innerHTML = `<h3>${esc(title)}</h3>` + (note ? `<small class="tip">${esc(note)}</small>` : '') + fields.map(x => `<label>${esc(x.label)}<input name="${x.name}" value="${esc(x.value || '')}" ${x.type ? `type="${x.type}"` : ''} ${x.req ? 'required' : ''} autocomplete="off"></label>`).join('') +
      `<div class="row"><button type="submit" value="ok" class="btn pri">${esc(T('ok'))}</button><button type="submit" value="x" class="btn" formnovalidate>${esc(T('cancel'))}</button></div>`;
    d.onclose = () => {
      if (d.returnValue === 'ok') { const o = {}; new FormData(f).forEach((v, k) => o[k] = String(v).trim()); res(o); } else res(null);
    };
    openDlg(d);
  });
}
function chooseFile(accept, multiple) {
  return new Promise(res => {
    const p = $('#picker'); p.value = ''; p.accept = accept; p.multiple = !!multiple;
    p.onchange = () => res([...p.files]);
    p.click();
  });
}

/* ============ Biblioteca ============ */
function probeDuration(blob) {
  return new Promise(res => {
    const a = new Audio(), u = URL.createObjectURL(blob); let done = false;
    const fin = d => { if (done) return; done = true; URL.revokeObjectURL(u); res(isFinite(d) ? d : 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => fin(a.duration); a.onerror = () => fin(0); setTimeout(() => fin(0), 4000);
    a.src = u;
  });
}
async function importFiles(files) {
  let n = 0;
  for (const f of files) {
    if (!f.type.startsWith('audio') && !/\.(mp3|m4a|aac|wav|ogg|opus|flac|weba)$/i.test(f.name)) continue;
    const blobId = await putBlob(f), dur = await probeDuration(f);
    const name = f.name.replace(/\.[^.]+$/, ''), m = name.split(/\s[-–]\s/);
    const tr = { id: uid(), title: m.length > 1 ? m.slice(1).join(' - ').trim() : name, artist: m.length > 1 ? m[0].trim() : '', blobId, dur, added: Date.now() };
    tracks.push(tr); await DB.put('tracks', tr); n++;
  }
  if (n) {
    await refreshAll(); toast(`${T('added')}: ${n}`);
    // Tras una acción del usuario el navegador suele conceder almacenamiento protegido contra limpieza automática
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(refreshStorageUI); } catch { }
  }
}
// Los navegadores solo pueden reproducir enlaces DIRECTOS a un archivo de audio, no páginas de streaming
const STREAM_RX = /(^|\.)(youtube\.com|youtu\.be|music\.youtube\.com|spotify\.com|soundcloud\.com|music\.apple\.com|deezer\.com|tidal\.com|bandcamp\.com|amazon\.com|tiktok\.com|instagram\.com|facebook\.com)$/i;
function probeUrl(src) {
  return new Promise(res => {
    const a = new Audio(); let done = false;
    const fin = d => { if (done) return; done = true; a.removeAttribute('src'); try { a.load(); } catch { } res(d); };
    a.preload = 'metadata'; a.onloadedmetadata = () => fin(isFinite(a.duration) ? a.duration : 0); a.onerror = () => fin(-1);
    setTimeout(() => fin(-1), 9000);
    a.src = src;
  });
}
async function addLink() {
  let o = { url: '', title: '', artist: '' }, note = T('urlHint'), dur = 0;
  for (; ;) {
    o = await ask(T('url'), [
      { name: 'url', label: T('link'), value: o.url, req: 1 },
      { name: 'title', label: T('ttl'), value: o.title },
      { name: 'artist', label: T('art'), value: o.artist }], note);
    if (!o) return;
    let u; try { u = new URL(o.url); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { note = T('urlBad'); continue; }
    const yid = ytIdOf(o.url); if (yid) { await addYouTube(yid, o); return; }
    if (STREAM_RX.test(u.hostname)) { note = T('urlStream'); continue; }
    toast(T('urlChecking'));
    dur = await probeUrl(o.url);
    if (dur < 0) { const v = await pick(T('urlBad'), [{ label: T('addAnyway'), value: 'y' }]); if (v !== 'y') { note = T('urlBad'); continue; } dur = 0; }
    break;
  }
  const u = new URL(o.url);
  let title = o.title; if (!title) { try { title = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '').replace(/\.[a-z0-9]{2,5}$/i, ''); } catch { } }
  const tr = { id: uid(), title: title || u.hostname, artist: o.artist || '', url: o.url, dur, added: Date.now() };
  tracks.push(tr); await DB.put('tracks', tr); await refreshAll(); toast(T('added'));
}

function trackRow(t) {
  return `<div class="row-item" data-id="${t.id}"><img src="${covers.get('t' + t.id) || ''}" alt=""><div class="ti"><b>${esc(t.title)}</b><small>${esc(t.artist || '—')}</small></div><span class="dur">${t.dur ? fmt(t.dur) : ''}</span><button class="icon" data-more="${t.id}" data-ico="more" aria-label="Menu"></button></div>`;
}
const visibleIds = () => {
  const q = ($('#q').value || '').toLowerCase().trim();
  return tracks.filter(t => !q || (t.title + ' ' + t.artist).toLowerCase().includes(q)).map(t => t.id);
};
function renderLib() {
  const ids = visibleIds(), box = $('#tracks');
  box.innerHTML = ids.length ? ids.map(id => trackRow(TM.get(id))).join('') : `<div class="empty">${esc(T('empty'))}</div>`;
  hydrate(box);
}
function renderPls() {
  const box = $('#pls');
  box.innerHTML = pls.map(p => `<div class="card-pl" data-id="${p.id}"><img src="${covers.get('p' + p.id) || ''}" alt=""><b>${esc(p.name)}</b><small>${p.ids.length} ${esc(T('tracks'))}</small></div>`).join('') || `<div class="empty" style="grid-column:1/-1">—</div>`;
}
function renderPl() {
  const p = PM.get(curPl); if (!p) return go('pls');
  $('#pl-name').textContent = p.name;
  $('#pl-cover').src = covers.get('p' + p.id) || '';
  const box = $('#pl-tracks'), items = p.ids.map(id => TM.get(id)).filter(Boolean);
  box.innerHTML = items.length ? items.map(trackRow).join('') : `<div class="empty">—</div>`;
  hydrate(box);
}
async function refreshAll() {
  rebuild(); await warmCovers(); renderLib(); renderPls(); if (view === 'pl') renderPl(); renderPlayerUI();
}

/* ============ Menús ============ */
async function choosePlaylist() {
  const opts = pls.map(p => ({ label: p.name, value: p.id })).concat([{ label: '+ ' + T('newpl'), value: '__new' }]);
  const v = pls.length ? await pick(T('addpl'), opts) : '__new';
  if (v === '__new') { const id = await createPlaylist(); return id; }
  return v;
}
async function createPlaylist() {
  const o = await ask(T('newpl'), [{ name: 'name', label: T('name'), req: 1 }]);
  if (!o || !o.name) return null;
  const p = { id: uid(), name: o.name, ids: [], coverId: null };
  pls.push(p); await DB.put('playlists', p); await refreshAll(); return p.id;
}
async function trackMenu(id, ctx) {
  const tr = TM.get(id); if (!tr) return;
  const o = [{ label: T('addpl'), value: 'add' }, { label: T('cover'), value: 'cover' }];
  if (ctx === 'pl') o.push({ label: T('rm'), value: 'rm' });
  o.push({ label: T('del'), value: 'del', danger: true });
  const v = await pick(tr.title, o);
  if (v === 'add') {
    const pid = await choosePlaylist(), p = PM.get(pid);
    if (p && !p.ids.includes(id)) { p.ids.push(id); await DB.put('playlists', p); await refreshAll(); toast(T('added')); }
  } else if (v === 'cover') {
    const [f] = await chooseFile('image/*');
    if (f) { const old = tr.coverId; tr.coverId = await putBlob(f); dropBlob(old); await DB.put('tracks', tr); await refreshAll(); }
  } else if (v === 'rm') {
    const p = PM.get(curPl); if (p) { p.ids = p.ids.filter(x => x !== id); await DB.put('playlists', p); await refreshAll(); }
  } else if (v === 'del') {
    if (cur() && cur().id === id) { ytStop(); audio.pause(); audio.removeAttribute('src'); P.queue = []; P.idx = -1; }
    tracks = tracks.filter(t => t.id !== id); dropBlob(tr.blobId); dropBlob(tr.coverId);
    await DB.del('tracks', id);
    for (const p of pls) if (p.ids.includes(id)) { p.ids = p.ids.filter(x => x !== id); await DB.put('playlists', p); }
    await refreshAll();
  }
}

/* ============ Reproducción ============ */
function playFrom(ids, id) { P.queue = [...ids]; return playIndex(P.queue.indexOf(id)); }
async function playIndex(i) {
  if (RT.on) remoteOff();
  if (i < 0 || i >= P.queue.length) return;
  P.idx = i; const tr = cur(); if (!tr) return;
  flashChange();
  const my = ++P.token;
  if (tr.yt) { await playYT(tr, my); return; }
  ytStop();
  let src = tr.url;
  if (tr.blobId) {
    const r = await DB.get('blobs', tr.blobId);
    if (my !== P.token) return;
    if (!r) { toast('Archivo no encontrado'); return; }
    if (P.url) URL.revokeObjectURL(P.url);
    P.url = URL.createObjectURL(r.blob); src = P.url;
  }
  audio.src = src;
  renderPlayerUI(); updateMeta();
  try { await audio.play(); } catch { }
}
function nextIndex(auto) {
  const n = P.queue.length; if (!n) return -1;
  if (auto && P.repeat === 'one') return P.idx;
  if (P.shuffle && n > 1) { let j; do { j = Math.floor(Math.random() * n); } while (j === P.idx); return j; }
  if (P.idx + 1 < n) return P.idx + 1;
  return (P.repeat === 'all' || !auto) ? 0 : -1;
}
const next = (auto) => { if (RT.on) { if (!auto && RT.tr) remoteCmd('next'); return; } const i = nextIndex(auto); if (i >= 0) playIndex(i); else { audio.pause(); audio.currentTime = 0; renderPlayerUI(); } };
function prev() {
  if (RT.on) { if (RT.tr) remoteCmd('prev'); return; }
  if (audio.currentTime > 3 || P.queue.length < 2) { audio.currentTime = 0; return; }
  playIndex(P.idx > 0 ? P.idx - 1 : P.queue.length - 1);
}
function toggle() {
  if (RT.on && !RT.tr) { remoteCmd('toggle'); return; }
  if (!cur()) { if (tracks.length) playFrom(tracks.map(t => t.id), tracks[0].id); else toast(T('noplay')); return; }
  if (audio.paused) audio.play().catch(() => { }); else audio.pause();
}
function setVol(v) { v = Math.min(100, Math.max(0, v)); audio.volume = v / 100; $$('.b-vol').forEach(e => { e.value = v; setFill(e); }); }
const setFill = e => { const mn = +e.min || 0, mx = +e.max || 100; e.style.setProperty('--pp', ((e.value - mn) / (mx - mn) * 100) + '%'); };

/* ============ Media Session (pantalla de bloqueo / segundo plano) ============ */
function updateMeta() {
  if (RT.on) return;
  const tr = cur(); if (!tr || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  const art = covers.get('t' + tr.id), a = { src: art };
  if (art && art.startsWith('data:image/png')) { a.sizes = '256x256'; a.type = 'image/png'; }
  try { navigator.mediaSession.metadata = new MediaMetadata({ title: tr.title, artist: tr.artist || '', album: 'Aurora Music', artwork: art ? [a] : [] }); } catch { }
}
function setPos() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  const d = audio.duration; if (!isFinite(d) || !d) return;
  try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: audio.playbackRate || 1, position: Math.min(audio.currentTime, d) }); } catch { }
}
function initMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession, set = (a, f) => { try { ms.setActionHandler(a, f); } catch { } };
  set('play', () => audio.play().catch(() => { })); set('pause', () => audio.pause());
  set('previoustrack', prev); set('nexttrack', () => next(false));
  set('seekbackward', d => { audio.currentTime = Math.max(0, audio.currentTime - ((d && d.seekOffset) || 10)); });
  set('seekforward', d => { audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + ((d && d.seekOffset) || 10)); });
  set('seekto', d => { audio.currentTime = d.seekTime; });
  set('stop', () => { audio.pause(); });
  set('enterpictureinpicture', () => { if (!pipWin) openPip(); }); // Chrome puede abrir el mini reproductor al cambiar de pestaña/minimizar
}

/* ============ UI del reproductor ============ */
function renderPlayerUI() {
  const tr = cur();
  $$('.b-title').forEach(e => e.textContent = tr ? tr.title : T('nothing'));
  $$('.b-artist').forEach(e => e.textContent = tr ? (tr.artist || '') : '');
  const cv = tr ? covers.get('t' + tr.id) : '';
  $$('.b-cover').forEach(e => { if (cv) e.src = cv; else e.removeAttribute('src'); });
  const playing = !audio.paused && !audio.ended;
  bodies().forEach(b => b.classList.toggle('playing', playing));
  $$('.b-play').forEach(e => setIco(e, playing ? 'pause' : 'play'));
  $$('[data-act=shuffle]').forEach(e => e.classList.toggle('on', P.shuffle));
  $$('[data-act=repeat]').forEach(e => { e.classList.toggle('on', P.repeat !== 'off'); setIco(e, P.repeat === 'one' ? 'repeat1' : 'repeat'); });
  $('#mini').hidden = !tr || view === 'player';
  $$('.row-item').forEach(r => r.classList.toggle('now', !!tr && r.dataset.id === tr.id));
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : (tr ? 'paused' : 'none');
  // El título de la ventana (y de la miniatura de la barra de tareas) muestra lo que suena
  document.title = tr ? tr.title + (tr.artist ? ' · ' + tr.artist : '') + ' — Aurora Music' : 'Aurora Music';
  // Botones de la miniatura de la barra de tareas (solo app de escritorio)
  if (DESK) { const k = playing + '|' + S.lang; if (renderPlayerUI.k !== k) { renderPlayerUI.k = k; try { DESK.setState({ playing, lang: S.lang }); } catch { } } }
  if (AND) pushAndroid(false);
  syncFake(); renderDisplay(); kick();
}
/* ============ Android: tarjeta de la notificación según el reproductor en uso ============ */
const loadImg = src => new Promise(r => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; setTimeout(() => r(null), 2500); });
async function dspPngSmall() {
  const el = stageEl.querySelector('.dsp-png'), u = el && el.getAttribute('src'); if (!u) return '';
  const im = await loadImg(u); if (!im) return '';
  try {
    const k = Math.min(1, 280 / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
    return c.toDataURL('image/png');
  } catch { return ''; }
}
async function skinArt(tr) {
  let dimg = null; if (S.skin === 'display') { const el = stageEl.querySelector('.dsp-png'); dimg = await loadImg(el && el.getAttribute('src')); }
  const N = 480, acc = S.accent || '#1ed760';
  let img = null; const src = tr ? covers.get('t' + tr.id) : '';
  if (src) img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; setTimeout(() => r(null), 2500); });
  const draw = im => {
    const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
    const rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
    const art = (x, y, w, h, r, circle) => {
      g.save(); if (circle) { g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2, 0, 7); } else rr(x, y, w, h, r); g.clip();
      if (im) { const s = Math.max(w / im.width, h / im.height); g.drawImage(im, x + (w - im.width * s) / 2, y + (h - im.height * s) / 2, im.width * s, im.height * s); }
      else { const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, acc); gr.addColorStop(1, '#101014'); g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold ' + Math.round(h * .5) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((Array.from(((tr && tr.title) || '♪').trim())[0] || '♪').toUpperCase(), x + w / 2, y + h / 2 + h * .04); }
      g.restore();
    };
    const lin = (a, b, y0, y1) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
    const sk = S.skin;
    if (sk === 'turntable') {
      g.fillStyle = lin('#e4e6e9', '#a9adb3', 0, N); g.fillRect(0, 0, N, N);
      g.fillStyle = '#17171a'; g.beginPath(); g.arc(236, 250, 205, 0, 7); g.fill();
      g.strokeStyle = '#c9ccd1'; g.lineWidth = 9; g.beginPath(); g.arc(236, 250, 210, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1.5; for (let r = 100; r < 200; r += 9) { g.beginPath(); g.arc(236, 250, r, 0, 7); g.stroke(); }
      art(236 - 78, 250 - 78, 156, 156, 0, true); g.fillStyle = '#e8e8e8'; g.beginPath(); g.arc(236, 250, 7, 0, 7); g.fill();
      g.fillStyle = '#2a2a2e'; g.beginPath(); g.arc(430, 70, 38, 0, 7); g.fill(); g.fillStyle = '#9a9da3'; g.beginPath(); g.arc(430, 70, 22, 0, 7); g.fill();
      g.strokeStyle = '#8b8e94'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(430, 70); g.lineTo(446, 330); g.lineTo(398, 392); g.stroke();
      g.fillStyle = '#222'; g.save(); g.translate(398, 392); g.rotate(.6); g.fillRect(-12, -6, 28, 34); g.restore();
    } else if (sk === 'mp3') {
      g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
      g.fillStyle = lin('#4a4a4e', '#222225', 70, 410); rr(14, 90, 452, 300, 34); g.fill();
      g.fillStyle = '#0a0a0c'; rr(34, 112, 200, 200, 8); g.fill(); art(40, 118, 188, 188, 6);
      g.fillStyle = '#9a9aa0'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillText('MUSIC', 356, 150);
      g.fillStyle = '#1a1a1d'; g.beginPath(); g.arc(356, 270, 96, 0, 7); g.fill(); g.fillStyle = '#4b4b50'; g.beginPath(); g.arc(356, 270, 36, 0, 7); g.fill();
      g.fillStyle = '#e6e6e6'; const tri = (x, y, d) => { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 14 * d, y); g.lineTo(x, y + 9); g.fill(); };
      tri(298, 270, -1); tri(414, 270, 1); tri(344, 346, 1); g.fillRect(364, 337, 4, 18);
      g.fillStyle = '#c8c8cc'; g.fillRect(40, 340, 188, 3); g.fillStyle = acc; g.fillRect(40, 340, 90, 3);
    } else if (sk === 'cassette') {
      g.fillStyle = '#17120e'; g.fillRect(0, 0, N, N);
      g.fillStyle = lin('#eee8d8', '#c8bfa6', 70, 410); rr(20, 80, 440, 320, 26); g.fill();
      g.fillStyle = '#f8f4e7'; rr(40, 100, 400, 110, 10); g.fill(); g.fillStyle = acc; g.fillRect(40, 100, 400, 20);
      art(46, 128, 70, 70, 6); g.fillStyle = '#9aa3b0'; g.fillRect(132, 150, 230, 6); g.fillRect(132, 172, 150, 5);
      g.fillStyle = '#1c1713'; rr(48, 222, 384, 112, 50); g.fill();
      for (const cx of [130, 350]) { g.fillStyle = '#3a281b'; g.beginPath(); g.arc(cx, 278, 40, 0, 7); g.fill(); g.fillStyle = '#efefef'; g.beginPath(); g.arc(cx, 278, 26, 0, 7); g.fill(); g.fillStyle = '#3d3d3d'; for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(cx, 278); g.arc(cx, 278, 26, a * 1.047, a * 1.047 + .52); g.fill(); } g.fillStyle = '#17120e'; g.beginPath(); g.arc(cx, 278, 10, 0, 7); g.fill(); }
      g.fillStyle = acc; g.fillRect(190, 276, 100, 4);
      g.fillStyle = lin('#f4f4f2', '#b9b9b4', 346, 386); for (const x of [92, 190, 330]) { rr(x, 346, x === 190 ? 100 : 60, 40, 6); g.fill(); }
    } else if (sk === 'cd') {
      g.fillStyle = lin('#f1f2f4', '#9aa0a8', 0, N); g.fillRect(0, 0, N, N);
      const cg = g.createRadialGradient(190, 150, 20, 240, 220, 220); cg.addColorStop(0, '#dfe3e8'); cg.addColorStop(.5, '#8f99a7'); cg.addColorStop(1, '#d6dae0');
      g.fillStyle = '#20252a'; g.beginPath(); g.arc(240, 220, 214, 0, 7); g.fill(); g.fillStyle = cg; g.beginPath(); g.arc(240, 220, 196, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 14; g.beginPath(); g.arc(240, 220, 150, 3.6, 4.5); g.stroke(); g.beginPath(); g.arc(240, 220, 150, .5, 1.4); g.stroke();
      art(240 - 88, 220 - 88, 176, 176, 0, true); g.fillStyle = '#2a2e33'; g.beginPath(); g.arc(240, 220, 24, 0, 7); g.fill(); g.strokeStyle = '#d3d7dc'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#a3b891'; rr(60, 410, 360, 36, 8); g.fill(); g.fillStyle = '#1b2a17'; g.fillRect(74, 438, 332, 4); g.fillRect(74, 438, 120, 4);
    } else if (sk === 'radio') {
      g.fillStyle = '#17110b'; g.fillRect(0, 0, N, N);
      g.fillStyle = lin('#94603a', '#4f2d18', 90, 390); rr(14, 90, 452, 300, 26); g.fill();
      g.fillStyle = '#2c1b0e'; rr(34, 110, 128, 260, 10); g.fill(); g.strokeStyle = '#c9a36a'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#44301c'; for (let y = 120; y < 360; y += 14) g.fillRect(40, y, 116, 6);
      g.fillStyle = lin('#f2e8cb', '#d8c89b', 110, 290); rr(178, 110, 270, 170, 10); g.fill(); g.strokeStyle = '#c9a36a'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#3a2410'; for (let x = 194; x < 434; x += 10) g.fillRect(x, 140, 2, x % 40 === 4 ? 16 : 9); g.fillRect(194, 162, 240, 2);
      art(194, 184, 70, 70, 6); g.fillStyle = '#c0392b'; g.fillRect(300, 122, 5, 150);
      for (const [cx, r] of [[236, 26], [312, 34], [388, 26]]) { const kg = g.createRadialGradient(cx - 8, 330 - 8, 4, cx, 330, r); kg.addColorStop(0, '#f2efe6'); kg.addColorStop(1, '#7d7259'); g.fillStyle = kg; g.beginPath(); g.arc(cx, 330, r, 0, 7); g.fill(); }
    } else if (sk === 'display') {
      g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
      if (dimg) { const s = Math.min(N / dimg.width, N / dimg.height); g.drawImage(dimg, (N - dimg.width * s) / 2, (N - dimg.height * s) / 2, dimg.width * s, dimg.height * s); }
      else if (im) { g.globalAlpha = .45; const s = Math.max(N / im.width, N / im.height); g.drawImage(im, (N - im.width * s) / 2, (N - im.height * s) / 2, im.width * s, im.height * s); g.globalAlpha = 1; }
      if (!dimg) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, N, N); }
      g.fillStyle = S.look && S.look.display && S.look.display.color || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const t = (tr && tr.title) || 'Aurora Music'; let fs = 58; g.font = '700 ' + fs + 'px sans-serif'; while (g.measureText(t).width > N - 60 && fs > 24) { fs -= 4; g.font = '700 ' + fs + 'px sans-serif'; }
      g.fillText(t, N / 2, N / 2 - 14); g.globalAlpha = .7; g.font = '300 30px sans-serif'; g.fillText((tr && tr.artist) || '', N / 2, N / 2 + 36); g.globalAlpha = 1;
      g.fillStyle = acc; g.fillRect(N / 2 - 40, N / 2 + 70, 80, 4);
    } else { // moderno
      g.fillStyle = lin(acc, '#0b0b0f', 0, N); g.fillRect(0, 0, N, N); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, N, N);
      g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30; g.shadowOffsetY = 12; g.fillStyle = '#000'; rr(60, 50, 360, 360, 36); g.fill(); g.restore();
      art(60, 50, 360, 360, 36);
      g.fillStyle = acc; rr(60, 432, 360, 8, 4); g.fill();
    }
    return c.toDataURL('image/jpeg', .86);
  };
  try { return draw(img); } catch { try { return draw(null); } catch { return ''; } }
}
async function coverSmall(tr) {
  const src = tr ? covers.get('t' + tr.id) : '';
  if (!src) return '';
  const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; setTimeout(() => r(null), 2500); });
  if (!im) return '';
  try {
    const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d');
    const m = Math.min(im.width, im.height);
    g.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 200, 200);
    return c.toDataURL('image/jpeg', .85);
  } catch { return ''; }
}
let andBusy = false, andLast = '';
async function pushAndroid(force) {
  if (!AND || andBusy) return;
  const tr = cur(), playing = !audio.paused && !audio.ended;
  const d = audio.duration && isFinite(audio.duration) ? audio.duration : ((tr && tr.dur) || 0);
  const mode = S.ntfSkin === false ? 'system' : 'skin';
  const key = [S.lockApp === true, playing, tr ? tr.id : '', S.skin, S.accent, mode, tr && tr.coverId || '', Math.round(d), S.look && S.look.display && S.look.display.color, mode === 'skin' && playing ? Math.floor(audio.currentTime / 3) : 0].join('|');
  const pos = Math.round(audio.currentTime * 1000);
  if (!force && key === andLast) return;
  andBusy = true;
  try {
    const artKey = [tr ? tr.id : '', S.skin, S.accent, tr && tr.coverId || '', S.skin === 'display' ? [(S.look.display || {}).png, (S.look.display || {}).pngN, (S.look.display || {}).key, (S.look.display || {}).color].join(',') : ''].join('|');
    const o = {};
    if (pushAndroid.ak !== artKey) {
      pushAndroid.ak = artKey;
      o.art = tr ? await skinArt(tr) : '';
      o.cov = tr ? await coverSmall(tr) : '';
      o.dpng = S.skin === 'display' ? await dspPngSmall() : '';
    }
    andLast = key;
    const nice = x => String(x || '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
    AND.setState(JSON.stringify(Object.assign({ playing, title: tr ? nice(tr.title) : '', artist: tr ? nice(tr.artist) : '', dur: Math.round(d * 1000), pos, mode, lock: S.lockApp === true, skin: S.skin, acc: S.accent || '#1ed760', dcol: (S.look && S.look.display && S.look.display.color) || '#ffffff' }, o)));
  } catch { } finally { andBusy = false; }
}
if (AND) { audio.addEventListener('seeked', () => pushAndroid(true)); setInterval(() => pushAndroid(false), 1000); }
let lastPos = 0;
function onTime() {
  const d = audio.duration || (cur() && cur().dur) || 0, c = audio.currentTime, p = d ? Math.min(1, c / d) : 0;
  setVar('--prog', p.toFixed(4));
  $$('.b-cur').forEach(e => e.textContent = fmt(c));
  $$('.b-dur').forEach(e => e.textContent = fmt(d));
  if (!seeking) $$('.b-seek').forEach(e => { e.value = Math.round(p * 1000); setFill(e); });
  $$('.b-bar').forEach(e => e.style.width = (p * 100) + '%');
  if (Date.now() - lastPos > 1000) { lastPos = Date.now(); setPos(); }
}
['play', 'pause', 'ended', 'emptied'].forEach(ev => audio.addEventListener(ev, renderPlayerUI));
['timeupdate', 'loadedmetadata', 'durationchange'].forEach(ev => audio.addEventListener(ev, onTime));
audio.addEventListener('ended', () => { if (YTM.active || RT.on) return; next(true); });
audio.addEventListener('error', () => { if (audio.src) { toast('⚠'); } });

/* ============ Navegación ============ */
function go(v) {
  view = v; document.body.dataset.view = v; document.body.classList.remove('showchrome');
  $$('.view').forEach(e => e.hidden = e.id !== 'v-' + v);
  const el = $('#v-' + v); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
  const navKey = v === 'pl' ? 'pls' : v;
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.go === navKey));
  $('#main').scrollTop = 0;
  if (v === 'pl') renderPl();
  if (v !== 'player' && decorOn) setDecor(false);
  renderPlayerUI(); kick();
}

/* ============ Ajustes: aplicar ============ */
const lum = hex => { const n = parseInt(hex.slice(1), 16); const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126 * f(n >> 16) + .7152 * f((n >> 8) & 255) + .0722 * f(n & 255); };
const loadedFonts = new Set();
async function applyFont() {
  const fkey = S.font + '|' + (S.customFont ? S.customFont.blobId : '');
  if (applyFont.key === fkey) return;
  applyFont.key = fkey;
  let fam = '';
  if (S.font === 'Custom' && S.customFont) {
    try {
      const u = await blobURL(S.customFont.blobId);
      if (u) { const ff = new FontFace('AuroraCustom', `url(${u})`); await ff.load(); document.fonts.add(ff); fam = "'AuroraCustom'"; customFontUrl = u; }
    } catch { }
  } else if (S.font !== 'System') {
    if (!loadedFonts.has(S.font)) {
      const l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + S.font.replace(/ /g, '+') + ':wght@400;600;700&display=swap';
      document.head.appendChild(l); loadedFonts.add(S.font);
    }
    fam = `'${S.font}'`;
  }
  document.documentElement.style.setProperty('--font', (fam ? fam + ',' : '') + 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Arabic","Noto Sans JP",sans-serif');
}
async function applyBg() {
  const key = [S.bgtype, S.bgcolor, S.bgblob, S.bgurl, S.anim].join('|');
  if (applyBg.key === key) return; // no reconstruir el fondo (ni reiniciar el video) si nada cambió
  applyBg.key = key;
  const el = $('#bg'); el.innerHTML = ''; el.style.background = '';
  el.classList.toggle('aurora', S.bgtype === 'none');
  if (S.bgtype === 'color') el.style.background = S.bgcolor;
  let src = null, vid = false;
  if (S.bgtype === 'image' || S.bgtype === 'video') { src = await blobURL(S.bgblob); vid = S.bgtype === 'video'; }
  else if (S.bgtype === 'link' && S.bgurl) { src = S.bgurl; vid = /\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(S.bgurl); }
  if (!src) return;
  let m;
  if (vid) {
    m = document.createElement('video'); m.src = src; m.loop = true; m.muted = true; m.autoplay = true; m.playsInline = true;
    m.setAttribute('muted', ''); m.setAttribute('playsinline', '');
    if (S.anim) m.play().catch(() => { }); else m.pause();
  } else { m = document.createElement('img'); m.src = src; m.alt = ''; }
  el.appendChild(m);
}
function syncSettingsUI() {
  $('#s-lang').value = S.lang; $('#s-accent').value = S.accent; $('#s-bgcolor').value = S.bgcolor; $('#s-bgurl').value = S.bgurl;
  $('#s-dim').value = S.dim; $('#s-blur').value = S.blur; $('#s-anim').checked = S.anim; $('#s-vis').checked = S.vis; $('#s-trans').value = S.trans;
  [$('#s-dim'), $('#s-blur')].forEach(setFill);
  $$('.chips[data-set]').forEach(c => $$('button', c).forEach(b => b.classList.toggle('on', String(getPath(S, c.dataset.set)) === b.dataset.v)));
  $$('[data-bind]').forEach(e => { const v = getPath(S, e.dataset.bind); if (e.type === 'checkbox') e.checked = !!v; else if (v != null) e.value = v; });
  $$('[data-rpm]').forEach(x => x.classList.toggle('on', x.dataset.rpm === String(S.look.turntable.rpm)));
  $('#s-react').checked = S.react;
  $('#app-ver').textContent = APP_VERSION;
  $$('output[data-o]').forEach(o => { o.textContent = getPath(S, o.dataset.o) + (o.dataset.u || ''); });
  $$('input[type=range][data-bind]').forEach(setFill);
  $$('#swatches button').forEach(b => b.classList.toggle('on', b.dataset.c.toLowerCase() === String(S.accent).toLowerCase()));
  $$('#presets .preset').forEach(b => { const p = PRESETS[+b.dataset.i].set; b.classList.toggle('on', p.accent === S.accent && p.theme === S.theme && p.bgtype === S.bgtype && (p.bgtype !== 'color' || p.bgcolor === S.bgcolor)); });
  $('#bg-color').classList.toggle('show', S.bgtype === 'color');
  $('#bg-file').classList.toggle('show', S.bgtype === 'image' || S.bgtype === 'video');
  $('#bg-link').classList.toggle('show', S.bgtype === 'link');
  fillFonts();
}
function fillFonts() {
  const sel = $('#s-font'), list = FONTS.slice();
  if (S.customFont) list.push('Custom');
  sel.innerHTML = list.map(f => `<option value="${esc(f)}">${esc(f === 'Custom' ? S.customFont.name : f)}</option>`).join('');
  sel.value = S.font;
}
function applySettings() {
  const r = document.documentElement, b = document.body;
  r.style.setProperty('--accent', S.accent);
  r.style.setProperty('--onaccent', lum(S.accent) > .35 ? '#000' : '#fff');
  r.style.setProperty('--dim', S.dim / 100);
  r.style.setProperty('--blur', S.blur + 'px');
  r.style.setProperty('--ui', S.ui / 100); r.style.setProperty('--r', S.radius + 'px');
  r.style.setProperty('--pa', S.panelA / 100); r.style.setProperty('--pb', S.panelB + 'px');
  r.style.setProperty('--sp', (100 / clamp(S.speed, 40, 220)).toFixed(3));
  b.dataset.density = S.density;
  b.classList.toggle('fx-vig', !!S.fxVig); b.classList.toggle('fx-grain', !!S.fxGrain);
  b.classList.toggle('immersive', !!S.immersive && !decorOn);
  r.lang = S.lang; r.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  b.dataset.skin = S.skin; b.dataset.theme = S.theme; b.dataset.trans = S.trans;
  b.classList.toggle('noanim', !S.anim); b.classList.toggle('novis', !S.vis);
  const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = S.theme === 'light' ? '#f3f3f7' : '#0b0b0f';
  syncSettingsUI(); applyFont(); applyBg(); applyLook();
}
function applyI18n() {
  $$('[data-i18n]').forEach(e => e.textContent = T(e.dataset.i18n));
  $$('[data-i18n-ph]').forEach(e => e.placeholder = T(e.dataset.i18nPh));
  $$('[data-i18n-title]').forEach(e => e.title = T(e.dataset.i18nTitle));
  renderLib(); renderPls(); if (view === 'pl') renderPl(); renderPlayerUI(); if (typeof folderUI === 'function') folderUI();
}

/* ============ Eventos ============ */
function bind() {
  $$('nav button').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  $('#btn-import').onclick = async () => { const f = await chooseFile('audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.aac', true); if (f.length) importFiles(f); };
  if ($('#btn-url')) $('#btn-url').onclick = addLink;
  $('#q').addEventListener('input', renderLib);
  $('#btn-newpl').onclick = createPlaylist;

  $('#tracks').addEventListener('click', e => {
    const row = e.target.closest('.row-item'); if (!row) return;
    if (e.target.closest('[data-more]')) return trackMenu(row.dataset.id, 'lib');
    playFrom(visibleIds(), row.dataset.id);
  });
  $('#pl-tracks').addEventListener('click', e => {
    const row = e.target.closest('.row-item'); if (!row) return;
    if (e.target.closest('[data-more]')) return trackMenu(row.dataset.id, 'pl');
    const p = PM.get(curPl); if (p) playFrom(p.ids.filter(id => TM.has(id)), row.dataset.id);
  });
  $('#pls').addEventListener('click', e => { const c = e.target.closest('.card-pl'); if (c) { curPl = c.dataset.id; go('pl'); } });
  $('#pl-back').onclick = () => go('pls');
  $('#pl-play').onclick = () => { const p = PM.get(curPl); const ids = p ? p.ids.filter(id => TM.has(id)) : []; if (ids.length) playFrom(ids, ids[0]); };
  $('#pl-cov').onclick = async () => {
    const p = PM.get(curPl), [f] = await chooseFile('image/*,.gif'); if (!p || !f) return;
    const old = p.coverId; p.coverId = await putBlob(f); dropBlob(old); await DB.put('playlists', p); await refreshAll();
  };
  $('#pl-ren').onclick = async () => {
    const p = PM.get(curPl); if (!p) return;
    const o = await ask(T('ren'), [{ name: 'name', label: T('name'), value: p.name, req: 1 }]);
    if (o && o.name) { p.name = o.name; await DB.put('playlists', p); await refreshAll(); }
  };
  $('#pl-del').onclick = async () => {
    const p = PM.get(curPl); if (!p) return;
    const v = await pick(p.name, [{ label: T('del'), value: 'del', danger: true }]);
    if (v === 'del') { dropBlob(p.coverId); pls = pls.filter(x => x.id !== p.id); await DB.del('playlists', p.id); await refreshAll(); go('pls'); }
  };

  // Controles del reproductor (todas las skins comparten acciones).
  // Se conectan a la ventana principal y, cuando existe, a la ventana flotante.
  const wire = doc => {
  doc.addEventListener('click', e => {
    if (extraClick(e)) return;
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      if (act === 'toggle') toggle();
      else if (act === 'next') next(false);
      else if (act === 'prev') prev();
      else if (act === 'shuffle') { P.shuffle = !P.shuffle; renderPlayerUI(); }
      else if (act === 'repeat') { P.repeat = P.repeat === 'off' ? 'all' : P.repeat === 'all' ? 'one' : 'off'; renderPlayerUI(); }
      else if (act === 'volup') setVol(Math.round(audio.volume * 100) + 10);
      else if (act === 'voldown') setVol(Math.round(audio.volume * 100) - 10);
      return;
    }
    if (e.target.closest('#mini') && !e.target.closest('button')) go('player');
  });
  doc.addEventListener('input', e => {
    if (extraInput(e)) return;
    const t = e.target;
    if (t.classList.contains('b-seek')) { const d = audio.duration || 0; if (d) audio.currentTime = d * t.value / 1000; setFill(t); }
    else if (t.classList.contains('b-vol')) setVol(+t.value);
  });
  doc.addEventListener('pointerdown', e => { if (e.target.classList && e.target.classList.contains('b-seek')) seeking = true; });
  ['pointerup', 'pointercancel', 'change'].forEach(ev => doc.addEventListener(ev, () => { seeking = false; }));
  doc.addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowRight' && e.shiftKey) next(false);
    else if (e.code === 'ArrowLeft' && e.shiftKey) prev();
  });

  };
  wireDoc = wire; wire(document);

  // Ajustes
  $('#s-react').onchange = e => { S.react = e.target.checked; save(); onReactChange(); };
  $('#s-lang').innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('#s-lang').onchange = e => { S.lang = e.target.value; save(); applySettings(); applyI18n(); };
  // (los chips con data-set se manejan de forma delegada en extraClick, también dentro de la ventana flotante)
  $('#s-accent').oninput = e => { S.accent = e.target.value; save(); applySettings(); };
  $('#s-font').onchange = e => { S.font = e.target.value; save(); applyFont(); };
  $('#s-fontup').onclick = async () => {
    const [f] = await chooseFile('.ttf,.otf,.woff,.woff2,font/*'); if (!f) return;
    if (S.customFont) dropBlob(S.customFont.blobId);
    S.customFont = { name: f.name.replace(/\.[^.]+$/, ''), blobId: await putBlob(f) }; S.font = 'Custom'; save(); applySettings();
  };
  $('#s-bgcolor').oninput = e => { S.bgcolor = e.target.value; save(); applyBg(); };
  $('#s-bgfile').onclick = async () => {
    const vid = S.bgtype === 'video', [f] = await chooseFile(vid ? 'video/*' : 'image/*,.gif'); if (!f) return;
    dropBlob(S.bgblob); S.bgblob = await putBlob(f); save(); applyBg();
  };
  $('#s-bgurl').onchange = e => { S.bgurl = e.target.value.trim(); save(); applyBg(); };
  $('#s-dim').oninput = e => { S.dim = +e.target.value; save(); applySettings(); };
  $('#s-blur').oninput = e => { S.blur = +e.target.value; save(); applySettings(); };
  $('#s-anim').onchange = e => { S.anim = e.target.checked; save(); applySettings(); };
  $('#s-trans').onchange = e => { S.trans = e.target.value; save(); applySettings(); };
  $('#s-vis').onchange = e => { S.vis = e.target.checked; save(); applySettings(); };

  let deferred;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#btn-install').hidden = false; });
  $('#btn-install').onclick = async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch { } deferred = null; $('#btn-install').hidden = true; };
}

/* ============================================================
   VERSIÓN 2.0
   - Mini reproductor flotante (ventana siempre visible con el estilo elegido)
   - Stickers y personalización de cada reproductor
   - Animación reactiva al audio y giro del disco con inercia
   ============================================================ */
const APP_VERSION = '3.2';
const stageEl = $('#stage');
let wireDoc = null, decorOn = false, selStk = null, customFontUrl = null, pipPoll = 0;
let barsEq = [], barsLcd = [];
const EMOJIS = ['★', '♥', '☠', '♪', '⚡', '☾', '✿', '☮', '🔥', '💀', '🦇', '🕸️', '🌹', '👁️', '✨', '🎧', '💿', '🖤', '🐍', '🪽'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const bodies = () => pipWin ? [document.body, pipWin.document.body] : [document.body];
const setVar = (n, v) => stageEl.style.setProperty(n, v);
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split('.'), l = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] || {}), o); t[l] = v; };

/* ---------- Transición al cambiar de canción ---------- */
function flashChange() {
  bodies().forEach(b => b.classList.add('changing'));
  clearTimeout(flashChange.h);
  flashChange.h = setTimeout(() => bodies().forEach(b => b.classList.remove('changing')), 900);
}

/* ---------- Barras del ecualizador ---------- */
function buildBars() {
  const mk = (sel, n) => $$(sel).forEach(el => { el.innerHTML = Array.from({ length: n }, () => `<i style="animation-delay:-${Math.random().toFixed(2)}s"></i>`).join(''); });
  mk('.eq', 28); mk('.lcd-eq', 14); mk('.rt-eq', 8);
  barsEq = [...stageEl.querySelectorAll('.eq i')];
  barsLcd = [...stageEl.querySelectorAll('.lcd-eq i, .rt-eq i')];
}

/* ---------- Análisis de audio (solo lectura: no toca la salida de sonido) ---------- */
const AN = { ctx: null, an: null, src: null, data: null, ok: false, silent: false, zero: 0, forId: null };
const reactive = () => !!(S.react && AN.ok && !AN.silent);
function syncFake() { stageEl.querySelectorAll('.eq,.lcd-eq,.rt-eq').forEach(e => e.classList.toggle('fake', !reactive())); }
function setupAnalyser() {
  if (!S.react) return;
  try {
    const stream = audio.captureStream ? audio.captureStream() : null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!stream || !Ctx || !stream.getAudioTracks().length) { AN.ok = false; return; }
    if (!AN.ctx) { AN.ctx = new Ctx(); AN.an = AN.ctx.createAnalyser(); AN.an.fftSize = 256; AN.an.smoothingTimeConstant = 0.72; AN.data = new Uint8Array(AN.an.frequencyBinCount); }
    if (AN.src) { try { AN.src.disconnect(); } catch { } }
    AN.src = AN.ctx.createMediaStreamSource(stream);
    AN.src.connect(AN.an); // el analizador NO se conecta a la salida: el audio sigue por el <audio> normal
    if (AN.ctx.state === 'suspended') AN.ctx.resume().catch(() => { });
    AN.ok = true;
  } catch { AN.ok = false; }
}
function onReactChange() {
  AN.forId = null; AN.silent = false; AN.zero = 0;
  if (S.react && !audio.paused && cur()) { AN.forId = cur().id; setupAnalyser(); }
  syncFake(); kick();
}
audio.addEventListener('playing', () => {
  const t = cur();
  if (S.react && t && AN.forId !== t.id) { AN.forId = t.id; AN.silent = false; AN.zero = 0; setupAnalyser(); }
  syncFake(); kick();
});

/* ---------- Bucle de animación: giro con inercia + reacción al audio ---------- */
const ANI = { angle: 0, vel: 0, last: 0, handle: 0, win: null, bass: 0, mid: 0, treb: 0, dirty: false };
function targetVel() {
  if (!S.anim || audio.paused || audio.ended) return 0;
  const rate = audio.playbackRate || 1;
  if (S.skin === 'turntable') return (S.look.turntable.rpm === '45' ? 45 : 33.333) * 6 * rate;
  if (S.skin === 'modern' && S.look.modern.shape === 'circle') return 60;
  return 0;
}
const stageVisible = () => !!pipWin || (view === 'player' && !document.hidden);
function tick(ts) {
  ANI.handle = 0;
  const dt = Math.min(0.1, ANI.last ? (ts - ANI.last) / 1000 : 0.016); ANI.last = ts;
  const playing = !audio.paused && !audio.ended;
  const tv = targetVel();
  ANI.vel += (tv - ANI.vel) * (1 - Math.exp(-dt / (tv > ANI.vel ? 0.9 : 1.6))); // arranque lento y frenado suave
  if (tv === 0 && ANI.vel < 0.4) ANI.vel = 0;
  ANI.angle = (ANI.angle + ANI.vel * dt) % 360;
  setVar('--rot', ANI.angle.toFixed(2) + 'deg');
  let b = 0, m = 0, h = 0, live = false;
  if (playing && reactive()) {
    try {
      AN.an.getByteFrequencyData(AN.data); live = true;
      const d = AN.data, avg = (a, z) => { let s = 0; for (let i = a; i < z; i++) s += d[i]; return s / ((z - a) * 255); };
      b = avg(0, 3); m = avg(3, 14); h = avg(14, 44);
      const cu = cur();
      if (cu && !cu.blobId) { AN.zero = (b + m + h) < 0.002 ? AN.zero + 1 : 0; if (AN.zero > 90) { AN.silent = true; syncFake(); } }
      const upd = (bars, span) => {
        const n = bars.length;
        for (let i = 0; i < n; i++) { const idx = 1 + Math.floor(Math.pow(i / n, 1.5) * span); const v = Math.pow(d[idx] / 255, 1.35); bars[i].style.transform = 'scaleY(' + Math.max(0.08, v).toFixed(3) + ')'; }
      };
      if (S.skin === 'modern' && S.vis) upd(barsEq, 52); else if (S.skin === 'mp3' || S.skin === 'retro') upd(barsLcd, 40);
      ANI.dirty = true;
    } catch { }
  }
  if (!playing && ANI.dirty) { barsEq.concat(barsLcd).forEach(i => { i.style.transform = ''; }); ANI.dirty = false; }
  ANI.bass += (b - ANI.bass) * 0.4; ANI.mid += (m - ANI.mid) * 0.4; ANI.treb += (h - ANI.treb) * 0.4;
  setVar('--bass', ANI.bass.toFixed(3)); setVar('--mid', ANI.mid.toFixed(3)); setVar('--treb', ANI.treb.toFixed(3));
  if (stageVisible() && (live || ANI.vel > 0 || ANI.bass > 0.004)) { try { ANI.handle = ANI.win.requestAnimationFrame(tick); } catch { ANI.handle = 0; } }
}
function kick() {
  const want = pipWin && !pipWin.closed ? pipWin : window;
  if (ANI.handle && ANI.win !== want) { try { ANI.win.cancelAnimationFrame(ANI.handle); } catch { } ANI.handle = 0; }
  ANI.win = want;
  if (!ANI.handle && stageVisible()) { ANI.last = 0; try { ANI.handle = want.requestAnimationFrame(tick); } catch { ANI.handle = 0; } }
}

/* ---------- Tocadiscos: pitch real (cambia velocidad y tono, como un vinilo) ---------- */
function setPitch(v) {
  const rate = 1 + v / 100, keep = v === 0;
  try { audio.defaultPlaybackRate = rate; audio.playbackRate = rate; audio.preservesPitch = keep; audio.webkitPreservesPitch = keep; audio.mozPreservesPitch = keep; } catch { }
  $$('.pitch').forEach(e => { e.value = v; setFill(e); });
  $$('.pitch-val').forEach(e => { e.textContent = (v > 0 ? '+' : '') + v.toFixed(1) + '%'; });
}

/* ---------- Apariencia de cada reproductor ---------- */
function applyLook() {
  const L = S.look, b = document.body, r = document.documentElement;
  b.dataset.wood = L.turntable.wood; b.dataset.vinyl = L.turntable.vinyl; b.dataset.lcd = L.mp3.lcd; b.dataset.finish = L.mp3.finish; b.dataset.shape = L.modern.shape;
  b.classList.toggle('has-lid', !!L.turntable.lid); b.classList.toggle('nostrobe', !L.turntable.strobe);
  b.classList.toggle('noled', !L.turntable.led); b.classList.toggle('noaura', !L.modern.aura);
  b.classList.toggle('nocover', !L.mp3.cover);
  const D = L.display; b.dataset.dart = D.art; b.dataset.dfit = D.fit; b.dataset.dlay = D.layout; b.classList.toggle('dsp-nolines', !D.lines);
  r.style.setProperty('--dc', D.color);
  { // halo automático: claro si el texto es oscuro, oscuro si es claro (para que siempre se lea sobre tu PNG)
    const hx = String(D.color || '#fff').replace('#', ''), f = hx.length === 3 ? hx.replace(/./g, m => m + m) : hx.padEnd(6, 'f');
    const lum = (parseInt(f.slice(0, 2), 16) * .299 + parseInt(f.slice(2, 4), 16) * .587 + parseInt(f.slice(4, 6), 16) * .114) / 255;
    r.style.setProperty('--dh', lum < .5 ? 'rgba(255,255,255,.62)' : 'rgba(0,0,0,.7)');
  } r.style.setProperty('--ddim', D.dim / 100); r.style.setProperty('--dr', D.round + 'px');
  r.style.setProperty('--dfont', `'${D.font}',system-ui,"Segoe UI",sans-serif`);
  dspFont(); applyDspArt(); renderDisplay.k = ''; renderDisplay();
  r.style.setProperty('--woodc', L.turntable.woodColor);
  r.style.setProperty('--bodyc', L.mp3.auto ? S.accent : L.mp3.body);
  if (S.skin !== 'turntable') setPitch(0);
  if (applyLook.skin !== S.skin) {
    applyLook.skin = S.skin; selStk = null;
    const tools = $('#stk-tools'); if (tools) tools.classList.add('off');
    $$('.stk.sel').forEach(e => e.classList.remove('sel'));
    if (pipWin) resizePip();
  }
  syncPip(); kick();
}

/* ---------- Ventana flotante (mini reproductor) ---------- */
// En la app de escritorio el reproductor flotante es un "widget" sin marco: el tamaño sale del aparato elegido y de la escala del usuario
const WIDGET_BASE = { modern: { w: 380, h: 640 }, turntable: { w: 470, h: 536 }, mp3: { w: 340, h: 512 }, retro: { w: 460, h: 340 }, cassette: { w: 460, h: 360 }, cd: { w: 440, h: 440 }, radio: { w: 480, h: 330 }, display: { w: 380, h: 475 } };
const pipSize = () => {
  if (DESK) { const b = WIDGET_BASE[S.skin] || WIDGET_BASE.modern, k = clamp(S.wsize || 100, 60, 160) / 100; return { w: Math.round(b.w * k), h: Math.round(b.h * k) }; }
  return ['retro', 'cassette', 'radio'].includes(S.skin) ? { w: 480, h: 420 } : S.skin === 'cd' ? { w: 460, h: 480 } : S.skin === 'display' ? { w: 400, h: 500 } : S.skin === 'mp3' ? { w: 340, h: 600 } : S.skin === 'turntable' ? { w: 440, h: 620 } : { w: 420, h: 680 };
};
function resizePip() {
  if (!pipWin) return;
  const { w, h } = pipSize();
  if (DESK) { try { DESK.widgetResize(w, h); } catch { } } else { try { pipWin.resizeTo(w, h); } catch { } }
  setTimeout(() => { renderDisplay.k = ''; renderDisplay(); }, 300);
}
function syncPip() {
  if (!pipWin) return;
  try {
    const d = pipWin.document;
    d.documentElement.style.cssText = document.documentElement.style.cssText;
    d.documentElement.lang = document.documentElement.lang; d.documentElement.dir = document.documentElement.dir;
    for (const k of Object.keys(document.body.dataset)) d.body.dataset[k] = document.body.dataset[k];
    d.body.className = document.body.className + ' pipbody' + (DESK ? ' widget' : '');
    d.title = document.title;
    d.documentElement.style.setProperty('--widle', S.widle / 100);
  } catch { }
}
async function openPip() {
  if (AND) return; // en Android no hay ventana flotante: se usan la notificación y el widget
  if (pipWin) { closePip(); return; }
  if (decorOn) setDecor(false);
  const { w, h } = pipSize(); let win = null;
  // En la app de escritorio se usa una ventana propia sin marco y transparente (Document Picture-in-Picture no puede ser transparente)
  if (!DESK && 'documentPictureInPicture' in window) { try { win = await documentPictureInPicture.requestWindow({ width: w, height: h }); } catch { win = null; } }
  if (!win) { try { win = window.open('', 'aurora_mini', `popup=yes,width=${w},height=${h}`); } catch { win = null; } }
  if (!win) { toast(T('nopip')); return; }
  const d = win.document;
  d.title = document.title;
  $$('link[rel=stylesheet]', document).forEach(l => { const n = d.createElement('link'); n.rel = 'stylesheet'; n.href = l.href; d.head.appendChild(n); });
  const mv = d.createElement('meta'); mv.name = 'viewport'; mv.content = 'width=device-width,initial-scale=1'; d.head.appendChild(mv);
  const wrap = d.createElement('div'); wrap.className = 'pipwrap' + (DESK ? ' widget' : '');
  if (DESK) {
    // Barra mínima que aparece al pasar el ratón: estilo del aparato, tamaño, volver a la ventana principal y cerrar
    wrap.innerHTML = `<div class="wtool">
      <div class="chips" data-set="skin">
        <button data-v="modern" data-ico="disc" title="${esc(T('s1'))}" aria-label="${esc(T('s1'))}"></button>
        <button data-v="turntable" data-ico="vinyl" title="${esc(T('s2'))}" aria-label="${esc(T('s2'))}"></button>
        <button data-v="mp3" data-ico="mp3" title="${esc(T('s3'))}" aria-label="${esc(T('s3'))}"></button>
        <button data-v="display" data-ico="clock" title="${esc(T('s4'))}" aria-label="${esc(T('s4'))}"></button>
        <button data-v="retro" data-ico="retro" title="${esc(T('s5'))}" aria-label="${esc(T('s5'))}"></button>
        <button data-v="cassette" data-ico="cassette" title="${esc(T('s6'))}" aria-label="${esc(T('s6'))}"></button>
        <button data-v="cd" data-ico="cdp" title="${esc(T('s7'))}" aria-label="${esc(T('s7'))}"></button>
        <button data-v="radio" data-ico="radio" title="${esc(T('s8'))}" aria-label="${esc(T('s8'))}"></button>
      </div>
      <button class="wbtn" data-w="smaller" data-ico="minus" title="${esc(T('wSmaller'))}" aria-label="${esc(T('wSmaller'))}"></button>
      <button class="wbtn" data-w="bigger" data-ico="plus" title="${esc(T('wBigger'))}" aria-label="${esc(T('wBigger'))}"></button>
      <button class="wbtn" data-w="back" data-ico="expand" title="${esc(T('wBack'))}" aria-label="${esc(T('wBack'))}"></button>
      <button class="wbtn" data-w="close" data-ico="close" title="${esc(T('wClose'))}" aria-label="${esc(T('wClose'))}"></button>
    </div>`;
    hydrate(wrap);
  } else {
    wrap.innerHTML = `<div class="chips pipchips" data-set="skin"><button data-v="modern" data-i18n="s1"></button><button data-v="turntable" data-i18n="s2"></button><button data-v="mp3" data-i18n="s3"></button><button data-v="display" data-i18n="s4"></button><button data-v="retro" data-i18n="s5"></button><button data-v="cassette" data-i18n="s6"></button><button data-v="cd" data-i18n="s7"></button><button data-v="radio" data-i18n="s8"></button></div>`;
    $$('[data-i18n]', wrap).forEach(e => { e.textContent = T(e.dataset.i18n); });
  }
  d.body.appendChild(wrap); wrap.appendChild(stageEl);
  pipWin = win;
  if (customFontUrl) { try { const ff = new win.FontFace('AuroraCustom', `url(${customFontUrl})`); ff.load().then(f => d.fonts.add(f)).catch(() => { }); } catch { } }
  if (wireDoc) wireDoc(d);
  if (DESK) attachDrag(win);
  win.addEventListener('resize', () => { renderDisplay.k = ''; renderDisplay(); });
  win.addEventListener('pagehide', onPipClosed);
  clearInterval(pipPoll); pipPoll = setInterval(() => { if (!pipWin || pipWin.closed) onPipClosed(); }, 1000);
  $('#pip-note').hidden = false;
  syncPip(); syncSettingsUI(); renderPlayerUI(); kick(); dspFont(); applyDspArt(); setTimeout(() => { renderDisplay.k = ''; renderDisplay(true); }, 250);
}
function onPipClosed() {
  if (!pipWin) return;
  clearInterval(pipPoll); pipWin = null; ANI.handle = 0;
  $('#v-player').insertBefore(stageEl, $('#decor'));
  $('#pip-note').hidden = true;
  syncSettingsUI(); renderPlayerUI(); kick();
}
function closePip() { if (pipWin) { try { pipWin.close(); } catch { } onPipClosed(); } }

/* ---------- Botones de la barra del widget flotante ---------- */
function widgetAction(a) {
  if (a === 'smaller' || a === 'bigger') { S.wsize = clamp((S.wsize || 100) + (a === 'bigger' ? 10 : -10), 60, 160); save(); resizePip(); }
  else if (a === 'back') { closePip(); if (DESK) { try { DESK.showMain(); } catch { } } }
  else if (a === 'close') closePip();
}

/* ---------- Clics y cambios compartidos (ventana principal + flotante) ---------- */
function extraClick(e) {
  const t = e.target; if (!t || !t.closest) return false;
  const chip = t.closest('.chips[data-set] button');
  if (chip) {
    const sp = chip.parentElement.dataset.set; setPath(S, sp, chip.dataset.v); save(); applySettings();
    if (sp === 'look.display.art' && chip.dataset.v === 'png' && !S.look.display.png) pickDspPng();
    return true;
  }
  const wb = t.closest('[data-w]');
  if (wb) { widgetAction(wb.dataset.w); return true; }
  const rpm = t.closest('[data-rpm]');
  if (rpm) { S.look.turntable.rpm = rpm.dataset.rpm; save(); applySettings(); kick(); return true; }
  if (t.closest('.pitch-val')) { setPitch(0); return true; }
  return false;
}
function extraInput(e) {
  const t = e.target;
  if (t.classList && t.classList.contains('pitch')) { setPitch(+t.value); return true; }
  return false;
}

/* ---------- Stickers ---------- */
const findStk = id => (S.stickers[S.skin] || []).find(x => x.id === id);
async function renderStickers() {
  const tok = (renderStickers.tok = (renderStickers.tok || 0) + 1);
  for (const layer of $$('.stk-layer')) {
    const doc = layer.ownerDocument, list = S.stickers[layer.dataset.stk] || [], frag = doc.createDocumentFragment();
    for (const s of list) {
      const el = doc.createElement('div');
      el.className = 'stk ' + s.kind + (s.id === selStk ? ' sel' : '');
      el.dataset.id = s.id;
      el.style.cssText = `--x:${s.x};--y:${s.y};--sz:${s.size};--r:${s.rot};--op:${(s.op || 100) / 100};z-index:${s.z || 1}`;
      if (s.kind === 'img') {
        const im = doc.createElement('img'); im.draggable = false; im.alt = '';
        const u = await blobURL(s.blobId); if (u) im.src = u;
        el.appendChild(im);
      } else { el.textContent = s.text; if (s.color) el.style.color = s.color; }
      frag.appendChild(el);
    }
    if (tok !== renderStickers.tok) return;
    layer.replaceChildren(frag);
  }
}
function selectStk(id) {
  selStk = id;
  $$('.stk').forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  $('#stk-tools').classList.toggle('off', !id);
  const s = findStk(id); if (s && s.kind !== 'img') $('#stk-color').value = s.color || '#ffffff';
  if (s) $('#stk-op').value = s.op || 100;
}
/* Biblioteca de imágenes del usuario (PNG con transparencia, GIF, etc.) para reutilizarlas como stickers */
const blobInUse = id => !!id && (S.look.display.png === id || S.look.display.pngN === id || Object.values(S.stickers).some(l => l.some(x => x.blobId === id)) || S.stkLib.some(x => x.blobId === id));
async function renderStkLib() {
  const box = $('#stk-lib'); if (!box) return;
  $('#stk-libbox').hidden = !S.stkLib.length;
  const frag = document.createDocumentFragment();
  for (const it of S.stkLib) {
    const d = document.createElement('div'); d.className = 'lib'; d.dataset.lib = it.id;
    const u = await blobURL(it.blobId); if (u) d.style.backgroundImage = `url("${u}")`;
    d.innerHTML = '<i data-libdel>×</i>'; frag.appendChild(d);
  }
  box.replaceChildren(frag);
}
async function addImages(files, toLib = true) {
  const imgs = [...files].filter(f => /^image\//.test(f.type) || /\.(png|gif|webp|svg|jpe?g|avif)$/i.test(f.name));
  for (const f of imgs.slice(0, 10)) {
    const blobId = await putBlob(f);
    if (toLib && S.stkLib.length < 60) S.stkLib.push({ id: uid(), blobId });
    addSticker({ kind: 'img', blobId });
  }
  if (imgs.length) { save(); await renderStickers(); await renderStkLib(); selectStk(selStk); }
  return imgs.length;
}
function addSticker(o) {
  const list = S.stickers[S.skin];
  if (list.length >= 30) return;
  const z = list.reduce((m, x) => Math.max(m, x.z || 1), 1) + 1;
  const s = { id: uid(), x: 50, y: 50, rot: 0, z, size: o.kind === 'img' ? 30 : o.kind === 'emoji' ? 16 : 11, ...o };
  list.push(s); selStk = s.id; save();
}
function pickGrid(title, items) {
  return new Promise(res => {
    const d = $('#dlg'), f = d.querySelector('form');
    f.innerHTML = `<h3>${esc(title)}</h3><div class="pk g">${items.map((o, i) => `<button type="submit" value="${i}" class="btn">${esc(o)}</button>`).join('')}</div><button type="submit" value="x" class="btn ghost">${esc(T('cancel'))}</button>`;
    d.onclose = () => { const v = d.returnValue; res(v !== '' && v !== 'x' && items[+v] != null ? items[+v] : null); };
    openDlg(d);
  });
}
async function stkAction(a) {
  const list = S.stickers[S.skin], s = findStk(selStk);
  if (a === 'img') { const fs = await chooseFile('image/png,image/*,.png,.gif,.webp,.svg', true); if (fs.length) await addImages(fs); return; }
  else if (a === 'emoji') { const v = await pickGrid(T('stkEmo'), EMOJIS); if (v) addSticker({ kind: 'emoji', text: v }); }
  else if (a === 'text') { const o = await ask(T('stkTxt'), [{ name: 't', label: T('stkTxtAsk'), req: 1 }]); if (o && o.t) addSticker({ kind: 'text', text: o.t, color: '#ffffff' }); }
  else if (!s) return;
  else if (a === 'big') s.size = clamp(s.size * 1.12, 4, 160);
  else if (a === 'small') s.size = clamp(s.size / 1.12, 4, 160);
  else if (a === 'rotl') s.rot -= 15;
  else if (a === 'rotr') s.rot += 15;
  else if (a === 'front') s.z = list.reduce((m, x) => Math.max(m, x.z || 1), 1) + 1;
  else if (a === 'del') { list.splice(list.indexOf(s), 1); if (s.blobId && !blobInUse(s.blobId)) dropBlob(s.blobId); selStk = null; }
  save(); await renderStickers(); selectStk(selStk && findStk(selStk) ? selStk : null);
}
function stkDown(e) {
  if (!decorOn || !e.target.closest) return;
  const el = e.target.closest('.stk');
  if (!el) { if (e.target.closest('#stage')) selectStk(null); return; }
  const s = findStk(el.dataset.id); if (!s) return;
  e.preventDefault(); selectStk(s.id);
  const r = el.parentElement.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ox = s.x, oy = s.y;
  try { el.setPointerCapture(e.pointerId); } catch { }
  const mv = ev => {
    s.x = clamp(ox + (ev.clientX - sx) / r.width * 100, 0, 100); s.y = clamp(oy + (ev.clientY - sy) / r.height * 100, 0, 100);
    el.style.setProperty('--x', s.x); el.style.setProperty('--y', s.y);
  };
  const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); save(); };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
function setDecor(on) {
  if (on && pipWin) closePip();
  decorOn = !!on; if (!on) selStk = null;
  document.body.classList.toggle('decor', decorOn);
  document.body.classList.toggle('immersive', !!S.immersive && !decorOn);
  $('#decor').hidden = !decorOn; $('#btn-decor').classList.toggle('on', decorOn);
  $('#stk-tools').classList.add('off');
  setVar('--tx', '0deg'); setVar('--ty', '0deg');
  renderStickers();
}

/* ---------- Temas listos, colores, pestañas, pantalla limpia, copia de seguridad ---------- */
const PRESETS = [
  { n: 'Aurora', g: 'linear-gradient(135deg,#0b2b1c,#1ed760)', set: { theme: 'dark', accent: '#1ed760', bgtype: 'none', radius: 16, panelA: 62, panelB: 14, fxVig: false, fxGrain: false } },
  { n: 'Neon', g: 'linear-gradient(135deg,#10001c,#ff2bd6)', set: { theme: 'dark', accent: '#ff2bd6', bgtype: 'color', bgcolor: '#10001c', radius: 22, panelA: 55, panelB: 18, fxVig: true, fxGrain: false } },
  { n: 'Sunset', g: 'linear-gradient(135deg,#1d0b12,#ff7a3d)', set: { theme: 'dark', accent: '#ff7a3d', bgtype: 'color', bgcolor: '#1d0b12', radius: 20, panelA: 58, panelB: 16, fxVig: true, fxGrain: false } },
  { n: 'Ocean', g: 'linear-gradient(135deg,#04121f,#2bb3ff)', set: { theme: 'dark', accent: '#2bb3ff', bgtype: 'color', bgcolor: '#04121f', radius: 18, panelA: 60, panelB: 16, fxVig: false, fxGrain: false } },
  { n: 'Gothic', g: 'linear-gradient(135deg,#0a0709,#c0182c)', set: { theme: 'dark', accent: '#c0182c', bgtype: 'color', bgcolor: '#0a0709', radius: 6, panelA: 70, panelB: 10, fxVig: true, fxGrain: true } },
  { n: 'Candy', g: 'linear-gradient(135deg,#ffe6f0,#ff5fa2)', set: { theme: 'light', accent: '#ff5fa2', bgtype: 'color', bgcolor: '#ffe6f0', radius: 28, panelA: 70, panelB: 12, fxVig: false, fxGrain: false } },
  { n: 'Mono', g: 'linear-gradient(135deg,#0e0e0e,#9a9a9a)', set: { theme: 'dark', accent: '#e8e8e8', bgtype: 'color', bgcolor: '#0e0e0e', radius: 4, panelA: 75, panelB: 8, fxVig: false, fxGrain: true } },
  { n: 'Gold', g: 'linear-gradient(135deg,#141008,#e6b422)', set: { theme: 'dark', accent: '#e6b422', bgtype: 'color', bgcolor: '#141008', radius: 12, panelA: 65, panelB: 12, fxVig: true, fxGrain: false } }
];
const SWATCHES = ['#1ed760', '#ff2bd6', '#ff7a3d', '#2bb3ff', '#c0182c', '#ffd23f', '#9b5de5', '#00f5d4', '#ff5fa2', '#e8e8e8', '#7bd389', '#f15bb5'];

// Deja los ajustes de apariencia como nuevos (la música, portadas y playlists no se tocan)
function resetAppearance() {
  const old = S.stkLib.map(x => x.blobId).concat(Object.values(S.stickers).flat().map(x => x.blobId));
  S = normalizeS({ lang: S.lang });
  applyBg.key = null; applyFont.key = null; selStk = null;
  save(); old.filter(Boolean).forEach(dropBlob);
}
function showTab(k) {
  $$('#tabs button').forEach(x => x.classList.toggle('on', x.dataset.tab === k));
  $$('.tabpanel').forEach(x => x.classList.toggle('on', x.dataset.tab === k));
  try { sessionStorage.setItem('aurora-tab', k); } catch { }
}
function initUI() {
  $('#presets').innerHTML = PRESETS.map((p, i) => `<button class="preset" data-i="${i}" style="background:${p.g}">${esc(p.n)}</button>`).join('');
  $('#swatches').innerHTML = SWATCHES.map(c => `<button data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
  $('#presets').onclick = e => { const b = e.target.closest('.preset'); if (!b) return; Object.assign(S, PRESETS[+b.dataset.i].set); save(); applySettings(); };
  $('#swatches').onclick = e => { const b = e.target.closest('button[data-c]'); if (!b) return; S.accent = b.dataset.c; save(); applySettings(); };
  $('#tabs').onclick = e => { const b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); };
  try { showTab(sessionStorage.getItem('aurora-tab') || 'look'); } catch { }
  $('#chrome-btn').onclick = () => document.body.classList.toggle('showchrome');
  $('#btn-clean').onclick = () => { S.immersive = !S.immersive; save(); applySettings(); document.body.classList.remove('showchrome'); };
  $('#btn-open-decor').onclick = () => { go('player'); setDecor(true); };

  $('#s-export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    a.download = 'aurora-settings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
  $('#s-import').onclick = async () => {
    const [f] = await chooseFile('.json,application/json'); if (!f) return;
    try {
      const o = JSON.parse(await f.text()); if (!o || typeof o !== 'object' || Array.isArray(o)) throw 0;
      S = normalizeS(o); save(); applySettings(); applyI18n(); renderStickers(); renderStkLib(); toast(T('impOk'));
    } catch { toast(T('impBad')); }
  };
  $('#s-reset').onclick = async () => {
    const v = await pick(T('resetAsk'), [{ label: T('resetA'), value: 'y', danger: true }]);
    if (v === 'y') { resetAppearance(); applySettings(); applyI18n(); renderStickers(); renderStkLib(); toast(T('resetOk')); }
  };

  // Imágenes (PNG, GIF…) como stickers: desde la biblioteca, arrastrando o pegando
  $('#stk-lib').onclick = async e => {
    const el = e.target.closest('.lib'); if (!el) return;
    const it = S.stkLib.find(x => x.id === el.dataset.lib); if (!it) return;
    if (e.target.closest('[data-libdel]')) {
      S.stkLib = S.stkLib.filter(x => x !== it); if (!blobInUse(it.blobId)) dropBlob(it.blobId);
      save(); renderStkLib(); return;
    }
    addSticker({ kind: 'img', blobId: it.blobId }); await renderStickers(); selectStk(selStk);
  };
  $('#stk-op').addEventListener('input', e => {
    const s = findStk(selStk); if (!s) return;
    s.op = +e.target.value; save();
    const el = stageEl.querySelector(`.stk[data-id="${s.id}"]`); if (el) el.style.setProperty('--op', s.op / 100);
  });
  const hasFiles = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  document.addEventListener('dragover', e => { if (view === 'player' && hasFiles(e)) { e.preventDefault(); document.body.classList.add('dragging'); } });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
  document.addEventListener('drop', async e => {
    document.body.classList.remove('dragging');
    if (view !== 'player' || !hasFiles(e)) return;
    e.preventDefault(); if (!decorOn) setDecor(true); await addImages(e.dataTransfer.files);
  });
  document.addEventListener('paste', async e => {
    if (view !== 'player' || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
    const fs = [...((e.clipboardData && e.clipboardData.files) || [])].filter(f => f.type.startsWith('image/'));
    if (fs.length) { e.preventDefault(); if (!decorOn) setDecor(true); await addImages(fs); }
  });
}

/* ---------- Modo de recuperación: si algo impide abrir la app, se puede restaurar la apariencia ---------- */
function showRecovery(err) {
  if (document.getElementById('recover')) return;
  let t1 = 'The saved appearance could not be loaded.', t2 = 'Reset appearance and open';
  try { t1 = T('recoverT'); t2 = T('recoverB'); } catch { }
  const d = document.createElement('div'); d.id = 'recover';
  d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0b0b0f;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;text-align:center;font:16px system-ui,sans-serif';
  d.innerHTML = '<p style="margin:0;max-width:30em"></p><button style="font:inherit;font-weight:600;padding:12px 22px;border-radius:999px;border:0;background:#1ed760;color:#000;cursor:pointer"></button><small style="opacity:.5;max-width:30em;word-break:break-word"></small>';
  const [p, b, s] = d.children; p.textContent = t1; b.textContent = t2; s.textContent = String((err && err.message) || err || '');
  b.onclick = async () => {
    try {
      S = normalizeS({ lang: S && S.lang }); localStorage.setItem('aurora', JSON.stringify(S));
      if (Remote.on) await Remote.putSettings(JSON.stringify(S)); // también en la copia del disco, para que no vuelva
    } catch { }
    location.reload();
  };
  document.documentElement.appendChild(d);
}
window.__booted = false;
window.addEventListener('error', e => { if (!window.__booted) showRecovery(e.error || e.message); });
window.addEventListener('unhandledrejection', e => { if (!window.__booted) showRecovery(e.reason); });

/* ---------- Conexión de los controles nuevos ---------- */
function initExtras() {
  $('#btn-decor').onclick = () => setDecor(!decorOn);
  $('#decor-done').onclick = () => setDecor(false);
  $('#btn-pip').onclick = openPip;
  $('#btn-pipback').onclick = closePip;
  $('#decor').addEventListener('click', e => { const b = e.target.closest('[data-stk]'); if (b) stkAction(b.dataset.stk); });
  $('#stk-color').addEventListener('input', e => {
    const s = findStk(selStk); if (!s) return;
    s.color = e.target.value; save();
    const el = stageEl.querySelector(`.stk[data-id="${s.id}"]`); if (el) el.style.color = s.color;
  });
  const onBind = e => {
    const t = e.target, p = t.dataset && t.dataset.bind; if (!p) return;
    setPath(S, p, t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value);
    if (p === 'look.turntable.woodColor') S.look.turntable.wood = 'custom';
    if (p === 'look.mp3.body') S.look.mp3.auto = false;
    save(); applySettings();
  };
  document.addEventListener('input', onBind); document.addEventListener('change', onBind);
  document.addEventListener('pointerdown', stkDown);
  stageEl.addEventListener('wheel', e => {
    if (!decorOn || !selStk) return; const s = findStk(selStk); if (!s) return;
    e.preventDefault(); s.size = clamp(s.size * (e.deltaY < 0 ? 1.06 : 0.94), 4, 160);
    const el = stageEl.querySelector(`.stk[data-id="${s.id}"]`); if (el) el.style.setProperty('--sz', s.size);
    save();
  }, { passive: false });
  stageEl.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || S.skin !== 'modern' || !S.anim || decorOn) return;
    const w = stageEl.querySelector('.coverwrap'); if (!w) return;
    const r = w.getBoundingClientRect();
    setVar('--tx', (((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(1) + 'deg');
    setVar('--ty', (-((e.clientY - r.top) / r.height - 0.5) * 14).toFixed(1) + 'deg');
  });
  stageEl.addEventListener('pointerleave', () => { setVar('--tx', '0deg'); setVar('--ty', '0deg'); });
  document.addEventListener('keydown', e => {
    if (decorOn && selStk && e.key === 'Delete' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) stkAction('del');
  });
  document.addEventListener('visibilitychange', kick);
  addEventListener('beforeunload', () => { try { if (pipWin) pipWin.close(); } catch { } });
}


/* ============ Carpeta de música (Android) ============ */
const FOLD = { name: '', last: 0, added: 0 };
function folderUI() {
  const b = $('#btn-folder'); if (b) b.hidden = !(AND && AND.pickFolder);
  const st = $('#folder-status'); if (st && AND && AND.pickFolder) st.textContent = FOLD.name ? T('folderSet') + ': ' + FOLD.name : T('folderNone');
}
function scanFolder(force) {
  if (!AND || !AND.scan || !FOLD.name) return;
  const now = Date.now(); if (!force && now - FOLD.last < 60000) return;
  FOLD.last = now; FOLD.added = 0;
  try { AND.scan(JSON.stringify(tracks.filter(t => t.saf).map(t => t.saf))); } catch { }
}
function dataUrlBlob(d) {
  const i = d.indexOf(','), bin = atob(d.slice(i + 1)), u = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
  return new Blob([u], { type: (d.slice(5, i).split(';')[0]) || 'image/jpeg' });
}
window.auroraFolder = name => { FOLD.name = name || ''; folderUI(); scanFolder(true); };
window.auroraScanPart = async arr => {
  for (const f of arr || []) {
    if (tracks.some(t => t.saf === f.doc)) continue;
    const base = String(f.name || '').replace(/\.[^.]+$/, ''), m = base.split(/\s[-–]\s/);
    const tr = { id: uid(), title: f.title || (m.length > 1 ? m.slice(1).join(' - ').trim() : base), artist: f.artist || (m.length > 1 ? m[0].trim() : ''), url: f.p, saf: f.doc, dur: f.dur || 0, added: Date.now() };
    if (f.cover) { try { tr.coverId = await putBlob(dataUrlBlob(f.cover)); } catch { } }
    tracks.push(tr); await DB.put('tracks', tr); FOLD.added++;
  }
  await refreshAll();
};
window.auroraScanDone = async ids => {
  let removed = 0;
  // si la carpeta no responde (ids vacío) no se borra nada
  if (ids && ids.length) {
    const have = new Set(ids);
    for (const t of tracks.filter(x => x.saf && !have.has(x.saf))) {
      if (cur() && cur().id === t.id) continue;
      tracks = tracks.filter(x => x.id !== t.id); dropBlob(t.coverId); await DB.del('tracks', t.id);
      for (const p of pls) if (p.ids.includes(t.id)) { p.ids = p.ids.filter(x => x !== t.id); await DB.put('playlists', p); }
      removed++;
    }
    if (removed) await refreshAll();
  }
  if (FOLD.added) toast(T('folderAdded') + ': ' + FOLD.added); else if (removed) toast(T('folderRemoved'));
  FOLD.added = 0;
};
async function folderMenu() {
  if (!FOLD.name) { AND.pickFolder(); return; }
  const v = await pick(T('folderBtn') + ': ' + FOLD.name, [{ label: T('folderScan'), value: 'scan' }, { label: T('folderChange'), value: 'change' }, { label: T('folderForget'), value: 'forget', danger: true }]);
  if (v === 'scan') { toast(T('folderNew')); scanFolder(true); }
  else if (v === 'change') AND.pickFolder();
  else if (v === 'forget') { try { AND.forgetFolder(); } catch { } FOLD.name = ''; folderUI(); }
}

/* ============ Arranque ============ */
(async function boot() {
  // 1) ¿Hay copia en disco? Si el navegador no tiene ajustes (datos borrados, otra dirección), se restauran de ahí
  let idx = null;
  if (await Remote.init()) {
    try { idx = await Remote.index(); } catch { }
    if (idx && !hadSaved && idx.settings) {
      S = normalizeS(idx.settings);
      try { localStorage.setItem('aurora', JSON.stringify(S)); } catch { }
    }
  }
  if (/[?&]reset=1\b/.test(location.search)) { resetAppearance(); history.replaceState(null, '', location.pathname); }
  hydrate(); buildBars(); bind(); initExtras(); initUI(); initMediaSession();
  try { if (AND && AND.folder) FOLD.name = AND.folder() || ''; } catch { }
  const bf = $('#btn-folder'); if (bf) bf.onclick = folderMenu;
  if (AND && !S.lockOff) { S.lockApp = false; S.lockOff = true; try { save(); } catch { } }
  applySettings(); applyI18n();
  try { tracks = await DB.all('tracks') || []; pls = await DB.all('playlists') || []; } catch { tracks = []; pls = []; }
  await syncDisk(idx);
  tracks.sort((a, b) => a.added - b.added);
  await refreshAll(); setVol(100); onTime(); renderStickers(); syncFake();
  folderUI(); scanFolder(true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scanFolder(false); });
  go('lib');
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { }
  // Órdenes de la miniatura de la barra de tareas de Windows (anterior / pausa / siguiente)
  const runCmd = c => { if (c === 'toggle') toggle(); else if (c === 'play') { if (audio.paused) toggle(); } else if (c === 'pause') { if (!audio.paused) toggle(); } else if (c === 'next') next(false); else if (c === 'prev') prev(); else if (/^seek:/.test(c)) { audio.currentTime = +c.slice(5) || 0; } };
  if (DESK) DESK.onCommand(runCmd);
  window.auroraCmd = runCmd; // la notificación de Android llama aquí
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !DESK && !AND) {
    // Si una versión nueva toma el control, recarga una sola vez para usarla
    const hadCtl = !!navigator.serviceWorker.controller; let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtl && !reloaded) { reloaded = true; toast(T('updated')); setTimeout(() => location.reload(), 600); } });
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  // Latido para el lanzador de Windows: el mini servidor local se cierra solo cuando cierras la app
  if (Remote.on) {
    const hb = () => fetch('api/ping', { headers: { 'X-Aurora': '1' }, cache: 'no-store' }).catch(() => { });
    setInterval(hb, 15000);
  }
  refreshStorageUI(); renderStkLib();
  window.__booted = true;
  // Vigilante: si por cualquier motivo la pantalla quedara oculta, ofrece restaurar la apariencia
  setTimeout(() => { try { if (getComputedStyle(document.body).display === 'none' || !document.body.offsetHeight) showRecovery('blank'); } catch { } }, 1500);
})();

/* ============================================================
   ESTILO DISPLAY (v3.1): hora y día —o la canción— en letras muy espaciadas sobre un PNG.
   En el widget de escritorio no hay marco ni fondo: solo se ve el PNG con el texto encima.
   ============================================================ */
function dspFont() {
  const f = S.look.display.font; if (!f) return;
  let added = false;
  for (const win of [window, pipWin]) {
    try {
      const d = win && win.document; if (!d || [...d.querySelectorAll('link[data-gf]')].some(l => l.dataset.gf === f)) continue;
      const l = d.createElement('link'); l.rel = 'stylesheet'; l.dataset.gf = f; added = true;
      l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@500;700&display=swap';
      d.head.appendChild(l);
    } catch { }
  }
  if (added) { setTimeout(() => { renderDisplay.k = ''; renderDisplay(); }, 900); setTimeout(() => { renderDisplay.k = ''; renderDisplay(); }, 2500); }
}
// Quita el fondo liso (negro o blanco) de una imagen que no es un PNG recortado: pasa el brillo a transparencia
const keyCache = new Map();
function keyedURL(id, u, mode, t) {
  const k = id + '|' + mode + '|' + t; if (keyCache.has(k)) return keyCache.get(k);
  const pr = (async () => {
    const im = new Image(); im.src = u; await im.decode();
    const sc = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * sc)); c.height = Math.max(1, Math.round(im.naturalHeight * sc));
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, c.width, c.height);
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data, lo = t * 1.2, hi = lo + 45;
    const ss = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
    for (let i = 0; i < d.length; i += 4) {
      const v = mode === 'white' ? 255 - Math.min(d[i], d[i + 1], d[i + 2]) : Math.max(d[i], d[i + 1], d[i + 2]);
      d[i + 3] = Math.round(d[i + 3] * ss((v - lo) / (hi - lo)));
    }
    g.putImageData(img, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); return URL.createObjectURL(blob);
  })();
  keyCache.set(k, pr);
  if (keyCache.size > 12) { const f = keyCache.keys().next().value; keyCache.get(f).then(x => URL.revokeObjectURL(x)).catch(() => { }); keyCache.delete(f); }
  return pr;
}
// Mira las esquinas: si la imagen tiene un fondo liso negro o blanco, propone quitarlo
async function detectKey(blob) {
  try {
    if (/gif/.test(blob.type)) return 'off';
    const u = URL.createObjectURL(blob), im = new Image(); im.src = u; await im.decode();
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0, 64, 64); URL.revokeObjectURL(u);
    const pts = [[1, 1], [62, 1], [1, 62], [62, 62], [32, 1], [1, 32], [62, 32], [32, 62]].map(([x, y]) => g.getImageData(x, y, 1, 1).data);
    if (pts.some(p => p[3] < 200)) return 'off'; // ya tiene transparencia
    if (pts.every(p => Math.max(p[0], p[1], p[2]) < 40)) return 'black';
    if (pts.every(p => Math.min(p[0], p[1], p[2]) > 215)) return 'white';
  } catch { }
  return 'off';
}
async function applyDspArt() {
  const D = S.look.display, night = isNight(), id = (D.autoN && night && D.pngN) ? D.pngN : D.png; applyDspArt.night = night; let u = id ? await blobURL(id) : '';
  if (u && D.key !== 'off') { try { const r = await DB.get('blobs', id); if (!r || !/gif/.test(r.blob.type)) u = await keyedURL(id, u, D.key, D.keyT); } catch { } }
  stageEl.querySelectorAll('.dsp-png').forEach(i => { if (u) { if (i.getAttribute('src') !== u) i.src = u; } else i.removeAttribute('src'); });
}
const isNight = () => { const h = new Date().getHours(); return h >= 19 || h < 6; };
async function pickDspNight() {
  const [f] = await chooseFile('image/*,.gif'); if (!f) return;
  const old = S.look.display.pngN; S.look.display.pngN = await putBlob(f);
  if (old && !blobInUse(old)) dropBlob(old);
  save(); applySettings();
}
async function pickDspPng() {
  const [f] = await chooseFile('image/*,.gif'); if (!f) return;
  const old = S.look.display.png; S.look.display.png = await putBlob(f); S.look.display.key = await detectKey(f);
  if (S.look.display.key !== 'off') toast(T('dKeyAuto'));
  if (old && !blobInUse(old)) dropBlob(old);
  S.look.display.art = 'png'; save(); applySettings();
}
function renderDisplay(force) {
  const el = stageEl.querySelector('.dsp'); if (!el || (S.skin !== 'display' && !force)) return;
  const D = S.look.display, tr = cur(), now = new Date(), loc = { en: 'en-US', es: 'es-MX', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', ja: 'ja-JP', ar: 'ar' }[S.lang] || 'en-US';
  let eb, big, s1, s2, song = '';
  if (D.layout === 'poster') {
    const d = audio.duration || (tr && tr.dur) || 0;
    eb = T('dspNow'); big = tr ? tr.title : T('nothing'); s1 = tr ? (tr.artist || '') : ''; s2 = fmt(audio.currentTime || 0) + ' / ' + fmt(d);
  } else {
    const h = now.getHours(), I = o => new Intl.DateTimeFormat(loc, o).format(now);
    eb = T(h < 5 ? 'dspG4' : h < 12 ? 'dspG1' : h < 19 ? 'dspG2' : 'dspG3');
    big = I({ weekday: 'short' }).replace(/\./g, '');
    s1 = String(now.getDate()).padStart(2, '0') + ' ' + I({ month: 'long' });
    s2 = I({ hour: '2-digit', minute: '2-digit', hour12: !D.h24 });
    song = tr ? '♪ ' + tr.title + (tr.artist ? ' — ' + tr.artist : '') : '';
  }
  let changed = false;
  const put = (sel, txt) => { const e = el.querySelector(sel); if (e && e.textContent !== txt) { e.textContent = txt; changed = true; } };
  put('.dsp-eyebrow', eb); put('.dsp-big', big); put('.dsp-s1', s1); put('.dsp-s2', s2); put('.dsp-song', song);
  if (changed && el.dataset.k !== undefined && el.dataset.k !== big + song) { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); }
  el.dataset.k = big + song;
  // Ajusta el texto grande al ancho (el día corto o un título largo)
  const bg = el.querySelector('.dsp-big'), k = big + '|' + bg.clientWidth + '|' + D.font + '|' + D.layout;
  if (renderDisplay.k !== k && bg.clientWidth > 0) {
    renderDisplay.k = k; bg.style.fontSize = '';
    if (D.layout === 'clock') {
      let fs = parseFloat(el.ownerDocument.defaultView.getComputedStyle(bg).fontSize) || 60, n = 0;
      while (bg.scrollWidth > bg.clientWidth + 1 && n++ < 30) { fs *= .93; bg.style.fontSize = fs + 'px'; }
    }
  }
}
setInterval(() => { if (S.skin === 'display') { renderDisplay(); if (applyDspArt.night !== isNight()) applyDspArt(); } }, 1000);

/* Arrastre del widget con el ratón (el arrastre nativo de Windows bloquea el hover, por eso se hace a mano) */
function attachDrag(win) {
  const d = win.document; let st = null, raf = 0, last = null;
  d.addEventListener('pointerdown', e => {
    if (e.button !== 0 || (e.target.closest && e.target.closest('button,input,select,textarea,a,.stk,.wtool,[data-act]'))) return;
    st = { x: e.screenX, y: e.screenY }; last = null;
    try { DESK.widgetDrag('start'); } catch { }
    try { d.documentElement.setPointerCapture(e.pointerId); } catch { }
    d.body.classList.add('dragging');
  });
  d.addEventListener('pointermove', e => {
    if (!st) return; last = { dx: e.screenX - st.x, dy: e.screenY - st.y };
    if (!raf) raf = win.requestAnimationFrame(() => { raf = 0; if (last && st) { try { DESK.widgetDrag('move', last.dx, last.dy); } catch { } } });
  });
  const end = () => { if (!st) return; st = null; d.body.classList.remove('dragging'); try { DESK.widgetDrag('end', 0, 0, S.wsnap); } catch { } };
  d.addEventListener('pointerup', end); d.addEventListener('pointercancel', end);
  // Se vuelve casi transparente cuando no lo usas y se aclara al acercar el ratón
  let idleT = 0;
  const wake = () => { clearTimeout(idleT); const w = d.querySelector('.pipwrap'); if (w) w.classList.remove('idle'); };
  const sleep = () => { clearTimeout(idleT); idleT = setTimeout(() => { const w = d.querySelector('.pipwrap'); if (w && S.wfade && !st) w.classList.add('idle'); }, 1800); };
  d.addEventListener('pointerenter', wake, true); d.addEventListener('pointermove', wake);
  d.documentElement.addEventListener('pointerleave', sleep); d.addEventListener('mouseleave', sleep);
  sleep();
}
(() => {
  const pick = document.getElementById('dsp-pick'), clr = document.getElementById('dsp-clear');
  if (pick) pick.onclick = pickDspPng;
  const pn = document.getElementById('dsp-night'), cn = document.getElementById('dsp-night-clear');
  if (pn) pn.onclick = pickDspNight;
  if (cn) cn.onclick = () => { const old = S.look.display.pngN; S.look.display.pngN = null; if (old && !blobInUse(old)) dropBlob(old); save(); applySettings(); };
  if (clr) clr.onclick = () => { const old = S.look.display.png; S.look.display.png = null; if (old && !blobInUse(old)) dropBlob(old); S.look.display.art = 'cover'; save(); applySettings(); };
})();

/* ============================================================
   YOUTUBE (reproductor oficial incrustado) + MÚSICA LIBRE (Internet Archive / Jamendo)
   - El audio de YouTube NO se descarga: suena con su reproductor oficial, que queda visible abajo a la derecha.
   - Un audio silencioso del mismo largo mantiene viva toda la app (barra, teclas, pantalla de bloqueo, segundo plano).
   ============================================================ */
var YTM = { api: null, ready: null, player: null, active: false, sil: null, selfSeek: 0, switching: false, errRun: 0 };
const ytIdOf = s => { const m = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/.exec(s || ''); return m ? m[1] : null; };
function ytApi() {
  if (YTM.api) return YTM.api;
  YTM.api = new Promise((res, rej) => {
    if (window.YT && window.YT.Player) return res();
    const prevCb = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { try { if (prevCb) prevCb(); } catch { } res(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => rej(new Error('yt-api'));
    document.head.appendChild(s); setTimeout(() => rej(new Error('yt-timeout')), 15000);
  }).catch(e => { YTM.api = null; throw e; });
  return YTM.api;
}
function ytEnsure() {
  if (YTM.ready) return YTM.ready;
  YTM.ready = ytApi().then(() => new Promise((res, rej) => {
    YTM.player = new window.YT.Player('ytplayer', { width: 356, height: 200, playerVars: { playsinline: 1, rel: 0, enablejsapi: 1, origin: location.origin, widget_referrer: location.origin }, events: { onReady: () => res(), onStateChange: ytState, onError: ytError }, host: 'https://www.youtube.com' });
    setTimeout(() => rej(new Error('yt-player')), 15000);
  })).catch(e => { YTM.ready = null; throw e; });
  return YTM.ready;
}
function silentURL(sec) {
  const sr = 4000, n = Math.max(sr, Math.ceil(sec * sr)), buf = new ArrayBuffer(44 + n), v = new DataView(buf), u8 = new Uint8Array(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  u8.fill(128, 44);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function setSilent(sec, resumeAt) {
  if (YTM.sil) URL.revokeObjectURL(YTM.sil);
  YTM.sil = silentURL(sec + 1); YTM.switching = true;
  audio.src = YTM.sil;
  if (resumeAt) audio.addEventListener('loadedmetadata', () => { YTM.selfSeek = Date.now(); try { audio.currentTime = resumeAt; } catch { } }, { once: true });
  setTimeout(() => { YTM.switching = false; }, 700);
}
async function playYT(tr, my) {
  try { await ytEnsure(); } catch { toast(T('ytFail')); return; }
  if (my !== P.token) return;
  YTM.active = true; YTM.errRun = YTM.errRun || 0;
  $('#ytdock').hidden = false;
  setSilent(tr.dur || 600);
  try { YTM.player.loadVideoById(tr.yt); YTM.player.setVolume(Math.round(audio.volume * 100)); } catch { }
  renderPlayerUI(); updateMeta();
  try { await audio.play(); } catch { }
}
function ytStop() {
  if (!YTM.active) return;
  YTM.active = false; YTM.switching = true; setTimeout(() => { YTM.switching = false; }, 500);
  try { YTM.player.stopVideo(); } catch { }
  $('#ytdock').hidden = true;
}
function ytState(e) {
  if (!YTM.active) return; const st = e.data, tr = cur();
  if (st === 1) {
    YTM.errRun = 0;
    if (audio.paused) audio.play().catch(() => { });
    let d = 0; try { d = YTM.player.getDuration(); } catch { }
    if (tr && tr.yt && d > 1 && Math.abs((tr.dur || 0) - d) > 1.5) {
      tr.dur = Math.round(d); DB.put('tracks', tr).catch(() => { });
      let at = 0; try { at = YTM.player.getCurrentTime(); } catch { }
      setSilent(d, at); audio.play().catch(() => { }); renderLib();
    }
  } else if (st === 2) { if (!audio.paused && !YTM.switching) audio.pause(); }
  else if (st === 0) next(true);
}
function ytError(e) {
  toast(T('ytFail') + ' [' + (e && e.data) + ']');
  if (++YTM.errRun <= 3) setTimeout(() => { if (YTM.active && P.queue.length > 1) next(false); }, 2200);
}
audio.addEventListener('play', () => { if (YTM.active && !YTM.switching) { try { const st = YTM.player.getPlayerState(); if (st !== 1 && st !== 3) YTM.player.playVideo(); } catch { } } });
audio.addEventListener('pause', () => { if (YTM.active && !YTM.switching) { try { if (YTM.player.getPlayerState() === 1) YTM.player.pauseVideo(); } catch { } } });
audio.addEventListener('volumechange', () => { if (YTM.active) { try { YTM.player.setVolume(Math.round(audio.volume * 100)); } catch { } } });
audio.addEventListener('seeked', () => { if (YTM.active && Date.now() - YTM.selfSeek > 600) { try { YTM.player.seekTo(audio.currentTime, true); } catch { } } });
setInterval(() => {
  if (!YTM.active || !YTM.player || !YTM.player.getPlayerState) return;
  try {
    if (YTM.player.getPlayerState() !== 1) return;
    const t = YTM.player.getCurrentTime();
    if (audio.paused && !YTM.switching) audio.play().catch(() => { });
    if (Math.abs(audio.currentTime - t) > 1.2) { YTM.selfSeek = Date.now(); audio.currentTime = t; }
  } catch { }
}, 500);

async function squareThumb(blob) {
  try {
    const bm = await createImageBitmap(blob), ch = bm.width * 9 / 16, size = Math.min(bm.height, ch), sx = (bm.width - size) / 2, sy = (bm.height - size) / 2;
    const c = document.createElement('canvas'); c.width = c.height = 320; c.getContext('2d').drawImage(bm, sx, sy, size, size, 0, 0, 320, 320);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', .9));
  } catch { return blob; }
}
async function addYouTube(id, o) {
  let title = o.title, artist = o.artist, thumb = '';
  try {
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
    if (r.ok) { const j = await r.json(); title = title || j.title; artist = artist || j.author_name; thumb = j.thumbnail_url; }
  } catch { }
  const tr = { id: uid(), title: title || 'YouTube ' + id, artist: artist || '', yt: id, dur: 0, added: Date.now() };
  if (thumb) { try { const r = await fetch(thumb); if (r.ok) tr.coverId = await putBlob(await squareThumb(await r.blob())); } catch { } }
  tracks.push(tr); await DB.put('tracks', tr); await refreshAll(); toast(T('added'));
}

/* ---------- Música libre ---------- */
const DISC = { src: 'ov', res: [], prev: null, prevI: -1 };
async function fetchJSON(u, ms = 15000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); } finally { clearTimeout(t); }
}
const parseLen = s => { if (!s) return 0; s = String(s); return s.includes(':') ? s.split(':').reduce((x, y) => x * 60 + (+y || 0), 0) : (Math.round(+s) || 0); };
async function iaFiles(id) {
  const j = await fetchJSON('https://archive.org/metadata/' + encodeURIComponent(id)), fs = j.files || [];
  const mp3 = fs.filter(f => /\.mp3$/i.test(f.name)), use = (mp3.length ? mp3 : fs.filter(f => /\.(ogg|m4a)$/i.test(f.name))).slice(0, 40);
  const by = (j.metadata && [].concat(j.metadata.creator || []).join(', ')) || '';
  return use.map(f => ({ title: f.title || f.name.replace(/^.*\//, '').replace(/\.[^.]+$/, ''), artist: f.creator || by, dur: parseLen(f.length), url: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split('/').map(encodeURIComponent).join('/')}` }));
}
async function discSearch() {
  const raw = $('#disc-q').value.trim(), q = raw.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim(), box = $('#disc-res'); if (!q) return;
  stopPrev(); box.innerHTML = `<div class="empty">${esc(T('discSearching'))}</div>`;
  try {
    if (DISC.src === 'ov') {
      const j = await fetchJSON(`https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&page_size=25&mature=false`);
      DISC.res = (j.results || []).filter(t => t.url).map(t => ({ title: t.title || '—', artist: t.creator || '', dur: t.duration ? (t.duration > 10000 ? t.duration / 1000 : t.duration) : 0, url: t.url, cover: t.thumbnail || '', lic: ('CC ' + (t.license || '') + ' ' + (t.license_version || '')).trim() + (t.provider ? ' · ' + t.provider : '') }));
    } else if (DISC.src === 'jam') {
      const k = (S.jamendoId || '').trim(); if (!k) { $('#disc-key').hidden = false; box.innerHTML = `<div class="empty">${esc(T('discKeyHint'))}</div>`; return; }
      const j = await fetchJSON(`https://api.jamendo.com/v3.0/tracks/?client_id=${encodeURIComponent(k)}&format=json&limit=25&search=${encodeURIComponent(q)}&audioformat=mp32&imagesize=300`);
      DISC.res = (j.results || []).map(t => ({ title: t.name, artist: t.artist_name, dur: +t.duration || 0, url: t.audio, dl: t.audiodownload_allowed ? t.audiodownload : '', cover: t.image, lic: 'CC' }));
    } else {
      const qq = `(title:(${q}) OR creator:(${q}) OR subject:(${q})) AND mediatype:audio AND (licenseurl:*creativecommons* OR licenseurl:*publicdomain*)`;
      const j = await fetchJSON(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(qq)}&fl[]=identifier&fl[]=title&fl[]=creator&sort[]=downloads+desc&rows=25&output=json`);
      DISC.res = ((j.response && j.response.docs) || []).map(d => ({ ia: d.identifier, title: d.title || d.identifier, artist: [].concat(d.creator || []).join(', '), cover: `https://archive.org/services/img/${d.identifier}`, lic: 'CC / PD' }));
    }
  } catch { box.innerHTML = `<div class="empty">${esc(T('discErr'))}</div>`; return; }
  box.innerHTML = DISC.res.length ? DISC.res.map((r, i) => `<div class="disc-item" data-i="${i}"><img src="${esc(r.cover || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div class="ti"><b>${esc(r.title)}</b><small>${esc(r.artist || '—')} · ${esc(r.lic)}${r.dur ? ' · ' + fmt(r.dur) : ''}</small></div><button class="icon" data-d="play" data-ico="play" aria-label="Preview"></button><button class="icon" data-d="add" data-ico="plus" aria-label="Add"></button></div>`).join('') : `<div class="empty">${esc(T('discNone'))}</div>`;
  hydrate(box);
}
function stopPrev() { if (DISC.prev) { try { DISC.prev.pause(); } catch { } } DISC.prev = null; DISC.prevI = -1; $$('#disc-res [data-d=play]').forEach(b => setIco(b, 'play')); }
async function discPreview(i, btn) {
  if (DISC.prevI === i) { stopPrev(); return; }
  stopPrev(); const r = DISC.res[i]; if (!r) return;
  try {
    let url = r.url; if (r.ia) { const f = await iaFiles(r.ia); url = f[0] && f[0].url; }
    if (!url) { toast(T('discErr')); return; }
    audio.pause(); const a = new Audio(url); DISC.prev = a; DISC.prevI = i; setIco(btn, 'pause');
    a.onended = () => stopPrev(); a.onerror = () => { stopPrev(); toast(T('discErr')); };
    await a.play();
  } catch { stopPrev(); toast(T('discErr')); }
}
async function discAdd(i, btn) {
  const r = DISC.res[i]; if (!r) return; btn.disabled = true; toast(T('discSaving'));
  try {
    const items = r.ia ? await iaFiles(r.ia) : [{ title: r.title, artist: r.artist, dur: r.dur, url: r.url, dl: r.dl }];
    if (!items.length) { toast(T('discErr')); return; }
    let cb = null; if (r.cover) { try { const x = await fetch(r.cover); if (x.ok) cb = await x.blob(); } catch { } }
    for (const it of items) {
      const tr = { id: uid(), title: it.title, artist: it.artist, dur: it.dur || 0, added: Date.now(), url: it.url };
      // Una sola canción: se intenta guardar el archivo en tu equipo (funciona sin internet). Si el servidor no lo permite, queda como enlace.
      if (items.length === 1) { try { const x = await fetch(it.dl || it.url); if (x.ok) { const b = await x.blob(); if (b.size < 120e6) { tr.blobId = await putBlob(b); delete tr.url; } } } catch { } }
      if (cb) tr.coverId = await putBlob(cb);
      tracks.push(tr); await DB.put('tracks', tr);
    }
    await refreshAll(); toast(`${T('added')}: ${items.length}`);
  } catch { toast(T('discErr')); }
  btn.disabled = false;
}
(() => {
  const dlg = document.getElementById('disc'); if (!dlg) return;
  if ($('#btn-disc')) $('#btn-disc').onclick = () => { $('#disc-keyin').value = S.jamendoId || ''; openDlg(dlg); setTimeout(() => $('#disc-q').focus(), 50); };
  $('#disc-x').onclick = () => dlg.close();
  dlg.addEventListener('close', stopPrev);
  $('#disc-go').onclick = discSearch;
  $('#disc-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); discSearch(); } });
  $$('#disc-src button').forEach(b => b.onclick = () => {
    DISC.src = b.dataset.v; $$('#disc-src button').forEach(x => x.classList.toggle('on', x === b));
    $('#disc-key').hidden = DISC.src !== 'jam'; $('#disc-res').innerHTML = '';
  });
  $('#disc-keyin').onchange = e => { S.jamendoId = e.target.value.trim(); save(); };
  $('#disc-res').addEventListener('click', e => {
    const b = e.target.closest('[data-d]'); if (!b) return; const it = b.closest('.disc-item'), i = +it.dataset.i;
    if (b.dataset.d === 'play') discPreview(i, b); else discAdd(i, b);
  });
})();

/* ============================================================
   MODO ESPEJO (solo Windows): Aurora muestra y controla lo que suena en Spotify, YouTube (en el navegador), etc.
   El audio sigue saliendo de la otra app; Aurora lee el "ahora suena" de Windows (título, artista, portada, tiempo)
   y manda pausa / siguiente / anterior. Un audio silencioso sincronizado mueve el tocadiscos, la barra y los estilos.
   ============================================================ */
function remoteCmd(c) { RT.userAt = Date.now(); try { DESK && DESK.remoteCmd && DESK.remoteCmd(c); } catch { } }
function remoteBtn() { const b = document.getElementById('btn-remote'); if (b) b.classList.toggle('pri', RT.on); }
function remoteOn() {
  ytStop(); audio.pause(); P.queue = []; P.idx = -1;
  RT.on = true; RT.tr = null; RT.key = ''; RT.status = 'none';
  try { navigator.mediaSession.metadata = null; } catch { }
  try { DESK.remoteOn(true); } catch { }
  remoteBtn(); toast(T('remOn')); renderPlayerUI();
}
function remoteOff() {
  if (!RT.on) return;
  RT.on = false; RT.tr = null; RT.key = '';
  try { DESK.remoteOn(false); } catch { }
  RT.switching = true; audio.pause(); setTimeout(() => { RT.switching = false; }, 500);
  remoteBtn(); renderPlayerUI();
}
function rtSilent(sec, at) {
  if (RT.sil) URL.revokeObjectURL(RT.sil);
  RT.sil = silentURL(sec + 2); RT.switching = true; audio.src = RT.sil;
  audio.addEventListener('loadedmetadata', () => { RT.selfSeek = Date.now(); try { audio.currentTime = at || 0; } catch { } if (RT.on && RT.status === 'playing') audio.play().catch(() => { }); }, { once: true });
  setTimeout(() => { RT.switching = false; }, 800);
}
const b64img = b => 'data:image/' + (b.startsWith('/9j/') ? 'jpeg' : b.startsWith('R0lG') ? 'gif' : b.startsWith('UklG') ? 'webp' : 'png') + ';base64,' + b;
function onRemote(s) {
  if (!RT.on || !s) return;
  if (s.error) { toast(T('remErr')); remoteOff(); return; }
  RT.status = s.status || 'none';
  if (!s.title) {
    if (RT.tr) { RT.tr = null; RT.key = ''; RT.switching = true; audio.pause(); setTimeout(() => { RT.switching = false; }, 500); renderPlayerUI(); }
    return;
  }
  const key = s.title + '|' + (s.artist || '') + '|' + Math.round(s.dur || 0) + '|' + (s.app || '');
  let ui = false;
  if (key !== RT.key) {
    RT.key = key; ui = true;
    RT.tr = { id: '__remote', title: s.title, artist: s.artist || '', dur: s.dur || 0, remote: true, app: s.app || '' };
    covers.set('t__remote', s.thumb ? b64img(s.thumb) : genCover(s.title + (s.artist || '')));
    rtSilent(s.dur || 600, s.pos || 0); flashChange();
  } else if (s.thumb) { covers.set('t__remote', b64img(s.thumb)); ui = true; }
  if (ui) { renderPlayerUI(); updateMetaRemote(); }
  if (Date.now() - RT.userAt < 1500) return; // acabas de pulsar algo: espera a que la otra app responda
  if (RT.status === 'playing') { if (audio.paused && !RT.switching) audio.play().catch(() => { }); }
  else if (!audio.paused) { RT.switching = true; audio.pause(); setTimeout(() => { RT.switching = false; }, 500); }
  if (!RT.switching && Math.abs(audio.currentTime - (s.pos || 0)) > 1.5) { RT.selfSeek = Date.now(); try { audio.currentTime = s.pos || 0; } catch { } }
}
function updateMetaRemote() { /* Aurora no publica su propia ficha mientras refleja otra app, para no confundir a Windows */ }
audio.addEventListener('play', () => { if (RT.on && RT.tr && !RT.switching && RT.status !== 'playing') remoteCmd('toggle'); });
audio.addEventListener('pause', () => { if (RT.on && RT.tr && !RT.switching && RT.status === 'playing') remoteCmd('toggle'); });
audio.addEventListener('seeked', () => { if (RT.on && RT.tr && Date.now() - RT.selfSeek > 700) remoteCmd('seek:' + audio.currentTime.toFixed(1)); });
(() => {
  const b = document.getElementById('btn-remote'); if (!b) return;
  if (DESK && DESK.onRemote) DESK.onRemote(onRemote);
  if (!DESK || DESK.platform !== 'win32' || !DESK.onRemote) { b.hidden = true; return; }
  b.onclick = () => { if (RT.on) { remoteOff(); toast(T('remOff')); } else remoteOn(); };
})();

/* Botón "Instalar app" (teléfono y PC): aparece cuando el navegador permite instalarla */
(() => {
  const b = document.getElementById('btn-install'); if (!b || DESK) return;
  let ev = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); ev = e; b.hidden = false; });
  window.addEventListener('appinstalled', () => { b.hidden = true; ev = null; });
  b.onclick = async () => { if (!ev) return; ev.prompt(); try { await ev.userChoice; } catch { } ev = null; b.hidden = true; };
})();
