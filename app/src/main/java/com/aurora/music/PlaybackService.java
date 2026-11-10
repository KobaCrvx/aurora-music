package com.aurora.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Icon;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Base64;
import android.widget.RemoteViews;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import org.json.JSONObject;

/**
 * Servicio en primer plano: mantiene viva la app con la pantalla apagada y publica la tarjeta de musica
 * (portada segun el reproductor elegido, barra de progreso y botones) mediante una MediaSession.
 */
public class PlaybackService extends Service {
    static final String CH = "aurora_playback";
    static final int ID = 7;

    static PlaybackService inst;

    NotificationManager nm;
    PowerManager.WakeLock wl;
    MediaSession session;
    boolean foreground = false;
    boolean playing = false;
    String title = "";
    String artist = "";
    long dur = 0, pos = 0;
    Bitmap art, cover;
    String mode = "system", skin = "modern";
    int acc = 0xFF1ED760, dcol = 0xFFFFFFFF;

    static void push(Context c, String json) {
        try {
            JSONObject o = new JSONObject(json);
            if (o.optString("title").length() == 0) {
                stopNow(c);
                return;
            }
            if (inst != null) {
                inst.update(o);
                return;
            }
            Intent i = new Intent(c, PlaybackService.class);
            i.putExtra("json", json.length() < 600000 ? json : o.put("art", "").put("cov", "").toString());
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
            else c.startService(i);
        } catch (Exception ignored) {
        }
    }

    static Bitmap decode(String dataUrl) {
        if (dataUrl == null || dataUrl.length() == 0) return null;
        try {
            int k = dataUrl.indexOf(',');
            byte[] b = Base64.decode(k >= 0 ? dataUrl.substring(k + 1) : dataUrl, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(b, 0, b.length);
        } catch (Exception e) {
            return null;
        }
    }

    static void stopNow(Context c) {
        try {
            c.stopService(new Intent(c, PlaybackService.class));
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        inst = this;
        nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CH, "Reproduccion", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "aurora:playback");
        wl.setReferenceCounted(false);

        session = new MediaSession(this, "AuroraMusic");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { MainActivity.command("play"); }
            @Override public void onPause() { MainActivity.command("pause"); }
            @Override public void onSkipToNext() { MainActivity.command("next"); }
            @Override public void onSkipToPrevious() { MainActivity.command("prev"); }
            @Override public void onSeekTo(long p) { MainActivity.command("seek:" + (p / 1000.0)); }
        });
        session.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String c = intent.getStringExtra("c");
        if (c != null) {
            MainActivity.command(c);
            return START_NOT_STICKY;
        }
        String js = intent.getStringExtra("json");
        if (js != null) {
            try {
                update(new JSONObject(js));
            } catch (Exception ignored) {
            }
        }
        return START_NOT_STICKY;
    }

    void update(JSONObject o) {
        this.playing = o.optBoolean("playing");
        this.title = o.optString("title");
        this.artist = o.optString("artist");
        this.dur = o.optLong("dur");
        this.pos = o.optLong("pos");
        this.mode = o.optString("mode", "system");
        this.skin = o.optString("skin", "modern");
        try {
            this.acc = Color.parseColor(o.optString("acc", "#1ed760"));
        } catch (Exception e) {
            this.acc = 0xFF1ED760;
        }
        try {
            this.dcol = Color.parseColor(o.optString("dcol", "#ffffff"));
        } catch (Exception e) {
            this.dcol = 0xFFFFFFFF;
        }
        if (o.has("art")) this.art = decode(o.optString("art"));
        if (o.has("cov")) this.cover = decode(o.optString("cov"));

        MediaMetadata.Builder md = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, this.title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, this.artist)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, dur > 0 ? dur : -1);
        if (this.art != null) md.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, this.art);
        session.setMetadata(md.build());

        long acts = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO;
        session.setPlaybackState(new PlaybackState.Builder()
                .setActions(acts)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, pos, playing ? 1f : 0f, SystemClock.elapsedRealtime())
                .build());

        Notification n = build();
        if (!foreground) {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(ID, n);
            }
            foreground = true;
        } else {
            nm.notify(ID, n);
        }
        if (playing) {
            if (!wl.isHeld()) wl.acquire(10 * 60 * 60 * 1000L);
        } else if (wl.isHeld()) {
            wl.release();
        }
    }

    PendingIntent cmd(String c, int code) {
        Intent i = new Intent(this, PlaybackService.class);
        i.putExtra("c", c);
        return PendingIntent.getService(this, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    Notification.Action action(int res, String label, String c, int code) {
        return new Notification.Action.Builder(Icon.createWithResource(this, res), label, cmd(c, code)).build();
    }

    Notification build() {
        if ("skin".equals(mode)) {
            try {
                return buildSkin();
            } catch (Exception e) {
                // si algo falla con el diseno propio, se usa el estandar
            }
        }
        return buildSystem();
    }

    Notification buildSystem() {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent po = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        b.setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title.length() == 0 ? "Aurora Music" : title)
                .setContentText(artist)
                .setContentIntent(po)
                .setOngoing(playing)
                .setShowWhen(false)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(action(android.R.drawable.ic_media_previous, "Anterior", "prev", 1))
                .addAction(action(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        playing ? "Pausa" : "Reproducir", "toggle", 2))
                .addAction(action(android.R.drawable.ic_media_next, "Siguiente", "next", 3))
                .setStyle(new Notification.MediaStyle()
                        .setMediaSession(session.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));
        if (art != null) b.setLargeIcon(art);
        return b.build();
    }

    // ---------- Notificacion con el diseno del reproductor elegido ----------
    static String fmt(long ms) {
        long s = Math.max(0, ms / 1000);
        return (s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
    }

    static int mix(int c, int to, float t) {
        return Color.rgb((int) (Color.red(c) * (1 - t) + Color.red(to) * t), (int) (Color.green(c) * (1 - t) + Color.green(to) * t),
                (int) (Color.blue(c) * (1 - t) + Color.blue(to) * t));
    }

    /** Recorta la portada: circulo (r = 0.5) o esquinas redondeadas. */
    Bitmap shaped(Bitmap src, int px, float radiusFrac) {
        Bitmap out = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(out);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        float r = px * radiusFrac;
        if (src == null) {
            p.setColor(mix(acc, 0xFF101014, 0.35f));
            cv.drawRoundRect(new RectF(0, 0, px, px), r, r, p);
            p.setColor(0xDDFFFFFF);
            p.setTextAlign(Paint.Align.CENTER);
            p.setTextSize(px * 0.5f);
            String ch = title.length() > 0 ? title.substring(0, 1).toUpperCase() : "\u266A";
            cv.drawText(ch, px / 2f, px * 0.67f, p);
            return out;
        }
        cv.drawRoundRect(new RectF(0, 0, px, px), r, r, p);
        p.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        int w = src.getWidth(), h = src.getHeight(), m = Math.min(w, h);
        Rect from = new Rect((w - m) / 2, (h - m) / 2, (w - m) / 2 + m, (h - m) / 2 + m);
        cv.drawBitmap(src, from, new Rect(0, 0, px, px), p);
        return out;
    }

    void common(RemoteViews v, int txt, int sub, int ico, float coverR, int coverDp, boolean full) {
        float d = getResources().getDisplayMetrics().density;
        v.setTextViewText(R.id.n_title, title);
        v.setTextViewText(R.id.n_artist, artist);
        v.setTextColor(R.id.n_title, txt);
        v.setTextColor(R.id.n_artist, sub);
        v.setImageViewBitmap(R.id.n_cover, shaped(cover, Math.round(coverDp * d), coverR));
        v.setImageViewResource(R.id.n_play, playing ? R.drawable.n_pause : R.drawable.n_play);
        v.setInt(R.id.n_play, "setColorFilter", ico);
        v.setInt(R.id.n_prev, "setColorFilter", ico);
        v.setInt(R.id.n_next, "setColorFilter", ico);
        v.setOnClickPendingIntent(R.id.n_prev, cmd("prev", 11));
        v.setOnClickPendingIntent(R.id.n_play, cmd("toggle", 12));
        v.setOnClickPendingIntent(R.id.n_next, cmd("next", 13));
        if (full) {
            v.setInt(R.id.n_fill, "setImageLevel", dur > 0 ? (int) Math.min(10000, pos * 10000 / dur) : 0);
            v.setInt(R.id.n_fill, "setColorFilter", acc);
            v.setTextColor(R.id.n_cur, sub);
            v.setTextColor(R.id.n_dur, sub);
            v.setChronometer(R.id.n_cur, SystemClock.elapsedRealtime() - pos, null, playing);
            v.setTextViewText(R.id.n_dur, dur > 0 ? fmt(dur) : "");
        }
    }

    Notification buildSkin() {
        int bg, txt = 0xFFFFFFFF, sub = 0xB3FFFFFF, ico = 0xFFFFFFFF;
        RemoteViews big;
        float cr = 0.12f;
        int cdp = 104;
        if ("turntable".equals(skin)) {
            bg = 0xFFD9DCE0; txt = 0xFF1B1B1F; sub = 0xFF55585E; ico = 0xFF2A2A2E;
            big = new RemoteViews(getPackageName(), R.layout.n_turntable);
            big.setImageViewResource(R.id.n_arm, playing ? R.drawable.n_arm_on : R.drawable.n_arm_off);
            cr = 0.5f; cdp = 52;
        } else if ("mp3".equals(skin)) {
            bg = 0xFF000000;
            big = new RemoteViews(getPackageName(), R.layout.n_mp3);
            cr = 0.04f; cdp = 46;
        } else if ("display".equals(skin)) {
            bg = 0xFF000000; txt = dcol; ico = dcol;
            big = new RemoteViews(getPackageName(), R.layout.n_display);
            big.setInt(R.id.n_line, "setBackgroundColor", acc);
            cdp = 4;
        } else {
            bg = mix(acc, 0xFF0B0B0F, 0.72f);
            big = new RemoteViews(getPackageName(), R.layout.n_modern);
        }
        common(big, txt, sub, ico, cr, cdp, true);
        big.setInt(R.id.n_root, "setBackgroundColor", bg);

        RemoteViews small = new RemoteViews(getPackageName(), R.layout.n_small);
        common(small, txt, sub, ico, "turntable".equals(skin) ? 0.5f : 0.12f, 48, false);
        small.setInt(R.id.n_root, "setBackgroundColor", bg);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent po = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        b.setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentText(artist)
                .setContentIntent(po)
                .setOngoing(true)
                .setShowWhen(false)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setStyle(new Notification.DecoratedCustomViewStyle())
                .setCustomContentView(small)
                .setCustomBigContentView(big);
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    @Override
    public void onDestroy() {
        if (wl != null && wl.isHeld()) wl.release();
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        if (inst == this) inst = null;
        foreground = false;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
