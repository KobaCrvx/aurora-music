package com.aurora.music;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.os.SystemClock;
import android.widget.RemoteViews;

import java.io.File;
import java.io.FileOutputStream;

/** Dibuja el reproductor elegido (para la notificacion y para el widget de la pantalla de inicio). */
class SkinUi {
    final Context ctx;
    final boolean playing;
    final String title, artist, skin;
    final long dur, pos;
    final int acc, dcol;
    final Bitmap cover;
    Bitmap dpng;

    SkinUi(Context c, boolean playing, String title, String artist, String skin, long dur, long pos, int acc, int dcol, Bitmap cover) {
        this.ctx = c;
        this.playing = playing;
        this.title = title == null ? "" : title;
        this.artist = artist == null ? "" : artist;
        this.skin = skin == null ? "modern" : skin;
        this.dur = dur;
        this.pos = pos;
        this.acc = acc;
        this.dcol = dcol;
        this.cover = cover;
    }

    // ----- estado guardado (para que el widget funcione aunque la app este cerrada) -----
    static void save(Context c, boolean playing, String title, String artist, String skin, long dur, long pos, int acc, int dcol, Bitmap cover) {
        SharedPreferences.Editor e = c.getSharedPreferences("widget", Context.MODE_PRIVATE).edit();
        e.putBoolean("playing", playing).putString("title", title).putString("artist", artist).putString("skin", skin)
                .putLong("dur", dur).putLong("pos", pos).putInt("acc", acc).putInt("dcol", dcol).putLong("t", SystemClock.elapsedRealtime());
        e.apply();
        if (cover != null) {
            try {
                File f = new File(c.getFilesDir(), "cover.png");
                FileOutputStream o = new FileOutputStream(f);
                cover.compress(Bitmap.CompressFormat.PNG, 90, o);
                o.close();
                c.getSharedPreferences("widget", Context.MODE_PRIVATE).edit().putBoolean("hasCover", true).apply();
            } catch (Exception ignored) {
            }
        } else {
            c.getSharedPreferences("widget", Context.MODE_PRIVATE).edit().putBoolean("hasCover", false).apply();
        }
    }

    static void saveDpng(Context c, Bitmap b) {
        try {
            File f = new File(c.getFilesDir(), "dpng.png");
            if (b == null) {
                f.delete();
                return;
            }
            FileOutputStream o = new FileOutputStream(f);
            b.compress(Bitmap.CompressFormat.PNG, 100, o);
            o.close();
        } catch (Exception ignored) {
        }
    }

    static void markPaused(Context c) {
        c.getSharedPreferences("widget", Context.MODE_PRIVATE).edit().putBoolean("playing", false).apply();
    }

    static SkinUi load(Context c) {
        SharedPreferences p = c.getSharedPreferences("widget", Context.MODE_PRIVATE);
        Bitmap cv = null;
        if (p.getBoolean("hasCover", false)) {
            try {
                cv = BitmapFactory.decodeFile(new File(c.getFilesDir(), "cover.png").getAbsolutePath());
            } catch (Exception ignored) {
            }
        }
        Bitmap dp = null;
        try {
            File df = new File(c.getFilesDir(), "dpng.png");
            if (df.exists()) dp = BitmapFactory.decodeFile(df.getAbsolutePath());
        } catch (Exception ignored) {
        }
        String t = p.getString("title", "");
        SkinUi u;
        if (t.length() == 0) {
            u = new SkinUi(c, false, "Aurora Music", "Toca para abrir", p.getString("skin", "modern"), 0, 0, p.getInt("acc", 0xFF1ED760), p.getInt("dcol", 0xFFFFFFFF), null);
        } else {
            u = new SkinUi(c, p.getBoolean("playing", false), t, p.getString("artist", ""), p.getString("skin", "modern"),
                    p.getLong("dur", 0), p.getLong("pos", 0), p.getInt("acc", 0xFF1ED760), p.getInt("dcol", 0xFFFFFFFF), cv);
        }
        u.dpng = dp;
        return u;
    }

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

    /** Boton: en la notificacion habla con el servicio; en el widget abre un puente transparente que funciona aunque la app este cerrada. */
    PendingIntent click(String cmd, int code, boolean widget) {
        if (widget) {
            Intent i = new Intent(ctx, AuroraWidget.class);
            i.setAction(AuroraWidget.ACTION);
            i.putExtra("c", cmd);
            return PendingIntent.getBroadcast(ctx, 100 + code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        }
        Intent i = new Intent(ctx, PlaybackService.class);
        i.putExtra("c", cmd);
        return PendingIntent.getService(ctx, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    void common(RemoteViews v, int txt, int sub, int ico, float coverR, int coverDp, boolean full, boolean widget) {
        float d = ctx.getResources().getDisplayMetrics().density;
        v.setTextViewText(R.id.n_title, title);
        v.setTextViewText(R.id.n_artist, artist);
        v.setTextColor(R.id.n_title, txt);
        v.setTextColor(R.id.n_artist, sub);
        v.setImageViewBitmap(R.id.n_cover, shaped(cover, Math.min(Math.round(coverDp * d), 220), coverR));
        v.setImageViewResource(R.id.n_play, playing ? R.drawable.n_pause : R.drawable.n_play);
        v.setInt(R.id.n_play, "setColorFilter", ico);
        v.setInt(R.id.n_prev, "setColorFilter", ico);
        v.setInt(R.id.n_next, "setColorFilter", ico);
        v.setOnClickPendingIntent(R.id.n_prev, click("prev", 11, widget));
        v.setOnClickPendingIntent(R.id.n_play, click("toggle", 12, widget));
        v.setOnClickPendingIntent(R.id.n_next, click("next", 13, widget));
        if (full) {
            boolean hasEq = "modern".equals(skin) || "turntable".equals(skin) || "mp3".equals(skin) || "retro".equals(skin);
            if (hasEq) {
                v.setViewVisibility(R.id.n_eq, playing ? android.view.View.VISIBLE : android.view.View.INVISIBLE);
                int[] ef = {R.id.n_eqf0, R.id.n_eqf1, R.id.n_eqf2, R.id.n_eqf3, R.id.n_eqf4};
                for (int id : ef) v.setInt(id, "setColorFilter", "modern".equals(skin) || "mp3".equals(skin) ? acc : ico);
            }
            if ("cassette".equals(skin)) {
                int on = playing ? android.view.View.VISIBLE : android.view.View.GONE, off = playing ? android.view.View.GONE : android.view.View.VISIBLE;
                v.setViewVisibility(R.id.n_spinL, on);
                v.setViewVisibility(R.id.n_spinR, on);
                v.setViewVisibility(R.id.n_reelL, off);
                v.setViewVisibility(R.id.n_reelR, off);
            }
            if ("turntable".equals(skin) || "cd".equals(skin)) {
                v.setViewVisibility(R.id.n_spin, playing ? android.view.View.VISIBLE : android.view.View.GONE);
                v.setViewVisibility(R.id.n_disc, playing ? android.view.View.GONE : android.view.View.VISIBLE);
            }
            v.setInt(R.id.n_fill, "setImageLevel", dur > 0 ? (int) Math.min(10000, pos * 10000 / dur) : 0);
            v.setInt(R.id.n_fill, "setColorFilter", acc);
            v.setTextColor(R.id.n_cur, sub);
            v.setTextColor(R.id.n_dur, sub);
            v.setChronometer(R.id.n_cur, SystemClock.elapsedRealtime() - pos, null, playing);
            v.setTextViewText(R.id.n_dur, dur > 0 ? fmt(dur) : "");
        }
    }

    int bg() {
        if ("turntable".equals(skin)) return 0xFFD9DCE0;
        if ("retro".equals(skin)) return 0xFFD5D7DB;
        if ("cassette".equals(skin)) return 0xFFE6DFCB;
        if ("cd".equals(skin)) return 0xFFD8DCE0;
        if ("radio".equals(skin)) return 0xFF5A3418;
        if ("mp3".equals(skin) || "display".equals(skin)) return 0xFF000000;
        return mix(acc, 0xFF0B0B0F, 0.72f);
    }

    /** Fondo con esquinas redondeadas; en MP3 y Retro el propio aparato ya es el fondo. */
    void applyBg(RemoteViews v, boolean bodyIsBg) {
        if (bodyIsBg && ("display".equals(skin) && dpng != null)) {
            v.setViewVisibility(R.id.n_bg, android.view.View.GONE);
        } else if (bodyIsBg && ("mp3".equals(skin) || "retro".equals(skin) || "cassette".equals(skin) || "cd".equals(skin) || "radio".equals(skin))) {
            v.setViewVisibility(R.id.n_bg, android.view.View.GONE);
        } else {
            v.setInt(R.id.n_bg, "setColorFilter", bg());
        }
    }

    RemoteViews big(boolean widget) {
        int txt = 0xFFFFFFFF, sub = 0xB3FFFFFF, ico = 0xFFFFFFFF;
        RemoteViews big;
        float cr = 0.12f;
        int cdp = 104;
        String pk = ctx.getPackageName();
        if ("turntable".equals(skin)) {
            txt = 0xFF1B1B1F; sub = 0xFF55585E; ico = 0xFF2A2A2E;
            big = new RemoteViews(pk, R.layout.n_turntable);
            big.setImageViewResource(R.id.n_arm, playing ? R.drawable.n_arm_on : R.drawable.n_arm_off);
            cr = 0.5f; cdp = 52;
        } else if ("mp3".equals(skin)) {
            big = new RemoteViews(pk, R.layout.n_mp3);
            cr = 0.04f; cdp = 46;
        } else if ("retro".equals(skin)) {
            txt = 0xFF0D1C28; sub = 0xFF0D1C28; ico = 0xFF2A2A2E;
            big = new RemoteViews(pk, R.layout.n_retro);
            cr = 0.0f; cdp = 40;
        } else if ("cassette".equals(skin)) {
            txt = 0xFF26303D; sub = 0xFFE8DCC2; ico = 0xFF2B2B2B;
            big = new RemoteViews(pk, R.layout.n_cassette);
            cr = 0.06f; cdp = 34;
        } else if ("cd".equals(skin)) {
            txt = 0xFF1B2A17; sub = 0xFF1B2A17; ico = 0xFF2A2D31;
            big = new RemoteViews(pk, R.layout.n_cd);
            cr = 0.5f; cdp = 46;
        } else if ("radio".equals(skin)) {
            txt = 0xFF3A2410; sub = 0xFF3A2410; ico = 0xFF2A1C10;
            big = new RemoteViews(pk, R.layout.n_radio);
            cr = 0.0f; cdp = 1;
        } else if ("display".equals(skin)) {
            txt = dcol; ico = dcol;
            big = new RemoteViews(pk, R.layout.n_display);
            big.setInt(R.id.n_line, "setBackgroundColor", acc);
            if (dpng != null) big.setImageViewBitmap(R.id.n_dpng, dpng);
            cdp = 4;
        } else {
            big = new RemoteViews(pk, R.layout.n_modern);
        }
        common(big, txt, sub, ico, cr, cdp, true, widget);
        applyBg(big, true);
        return big;
    }

    RemoteViews small(boolean widget) {
        int txt = 0xFFFFFFFF, sub = 0xB3FFFFFF, ico = 0xFFFFFFFF;
        if ("turntable".equals(skin)) { txt = 0xFF1B1B1F; sub = 0xFF55585E; ico = 0xFF2A2A2E; }
        else if ("retro".equals(skin)) { txt = 0xFF0D1C28; sub = 0xFF0D1C28; ico = 0xFF2A2A2E; }
        else if ("cassette".equals(skin)) { txt = 0xFF26303D; sub = 0xFF5A6575; ico = 0xFF2B2B2B; }
        else if ("cd".equals(skin)) { txt = 0xFF1B2A17; sub = 0xFF3A4A36; ico = 0xFF2A2D31; }
        else if ("radio".equals(skin)) { txt = 0xFFF2E8CB; sub = 0xFFD8C89B; ico = 0xFFF2E8CB; }
        else if ("display".equals(skin)) { txt = dcol; ico = dcol; }
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.n_small);
        common(v, txt, sub, ico, "turntable".equals(skin) || "cd".equals(skin) ? 0.5f : 0.12f, 48, false, widget);
        applyBg(v, false);
        return v;
    }
}
