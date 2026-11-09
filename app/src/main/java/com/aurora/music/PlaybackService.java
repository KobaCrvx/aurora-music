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
    Bitmap art;

    static void push(Context c, boolean playing, String title, String artist, long dur, long pos, String artB64) {
        if (title == null || title.length() == 0) {
            stopNow(c);
            return;
        }
        Bitmap bmp = decode(artB64);
        if (inst != null) {
            inst.update(playing, title, artist, dur, pos, bmp);
            return;
        }
        Intent i = new Intent(c, PlaybackService.class);
        i.putExtra("playing", playing);
        i.putExtra("title", title);
        i.putExtra("artist", artist);
        i.putExtra("dur", dur);
        i.putExtra("pos", pos);
        if (artB64 != null && artB64.length() > 0 && artB64.length() < 400000) i.putExtra("art", artB64);
        try {
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
        update(intent.getBooleanExtra("playing", false), intent.getStringExtra("title"), intent.getStringExtra("artist"),
                intent.getLongExtra("dur", 0), intent.getLongExtra("pos", 0), decode(intent.getStringExtra("art")));
        return START_NOT_STICKY;
    }

    void update(boolean playing, String title, String artist, long dur, long pos, Bitmap bmp) {
        this.playing = playing;
        this.title = title == null ? "" : title;
        this.artist = artist == null ? "" : artist;
        this.dur = dur;
        this.pos = pos;
        if (bmp != null) this.art = bmp;

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
