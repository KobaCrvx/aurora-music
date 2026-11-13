package com.aurora.music;

import android.content.ContentResolver;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.webkit.WebResourceResponse;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

/** Carpeta de musica elegida por el usuario (Storage Access Framework): escaneo, metadatos y lectura con Range. */
class Library {
    static final String PREFIX = "/_f/";

    static class Item {
        String doc, name, mime;
        long size, mtime;
    }

    static boolean isAudio(String name, String mime) {
        if (mime != null && mime.startsWith("audio/")) return true;
        if (mime != null && mime.equals("application/ogg")) return true;
        String n = name == null ? "" : name.toLowerCase();
        return n.matches(".*\\.(mp3|m4a|aac|wav|ogg|opus|flac|weba|wma|amr)$");
    }

    static String enc(String doc) {
        return Base64.encodeToString(doc.getBytes(java.nio.charset.StandardCharsets.UTF_8), Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }

    static String dec(String s) {
        return new String(Base64.decode(s, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP), java.nio.charset.StandardCharsets.UTF_8);
    }

    /** Recorre la carpeta (y subcarpetas) y devuelve los archivos de audio. */
    static ArrayList<Item> list(Context c, Uri tree) {
        ArrayList<Item> out = new ArrayList<Item>();
        ContentResolver cr = c.getContentResolver();
        ArrayList<String> stack = new ArrayList<String>();
        stack.add(DocumentsContract.getTreeDocumentId(tree));
        HashSet<String> seen = new HashSet<String>();
        while (!stack.isEmpty() && out.size() < 20000) {
            String id = stack.remove(stack.size() - 1);
            if (!seen.add(id)) continue;
            Uri ch = DocumentsContract.buildChildDocumentsUriUsingTree(tree, id);
            Cursor q = null;
            try {
                q = cr.query(ch, new String[]{
                        DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                        DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                        DocumentsContract.Document.COLUMN_MIME_TYPE,
                        DocumentsContract.Document.COLUMN_SIZE,
                        DocumentsContract.Document.COLUMN_LAST_MODIFIED}, null, null, null);
                while (q != null && q.moveToNext()) {
                    String did = q.getString(0), nm = q.getString(1), mt = q.getString(2);
                    if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mt)) {
                        if (nm == null || !nm.startsWith(".")) stack.add(did);
                    } else if (isAudio(nm, mt) && (nm == null || !nm.startsWith("."))) {
                        Item it = new Item();
                        it.doc = did;
                        it.name = nm == null ? "" : nm;
                        it.mime = mt;
                        it.size = q.getLong(3);
                        it.mtime = q.getLong(4);
                        out.add(it);
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (q != null) q.close();
            }
        }
        return out;
    }

    /** Titulo, artista, duracion y portada pequena (jpg en base64) leidos de las etiquetas del archivo. */
    static JSONObject meta(Context c, Uri tree, Item it) {
        JSONObject o = new JSONObject();
        MediaMetadataRetriever r = new MediaMetadataRetriever();
        try {
            r.setDataSource(c, DocumentsContract.buildDocumentUriUsingTree(tree, it.doc));
            String t = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);
            String a = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);
            if (a == null || a.length() == 0) a = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST);
            String d = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            if (t != null && t.trim().length() > 0) o.put("title", t.trim());
            if (a != null && a.trim().length() > 0) o.put("artist", a.trim());
            if (d != null) o.put("dur", Long.parseLong(d) / 1000.0);
            byte[] pic = r.getEmbeddedPicture();
            if (pic != null && pic.length > 0) {
                BitmapFactory.Options op = new BitmapFactory.Options();
                op.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(pic, 0, pic.length, op);
                int s = 1;
                while (op.outWidth / (s * 2) >= 300) s *= 2;
                op = new BitmapFactory.Options();
                op.inSampleSize = s;
                Bitmap b = BitmapFactory.decodeByteArray(pic, 0, pic.length, op);
                if (b != null) {
                    ByteArrayOutputStream bo = new ByteArrayOutputStream();
                    b.compress(Bitmap.CompressFormat.JPEG, 80, bo);
                    o.put("cover", "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP));
                    b.recycle();
                }
            }
        } catch (Throwable ignored) {
        } finally {
            try {
                r.release();
            } catch (Throwable ignored) {
            }
        }
        return o;
    }

    /** Respuesta para el <audio> de la pagina: lee el archivo del almacenamiento, con soporte de Range (adelantar/atrasar). */
    static WebResourceResponse open(Context c, Uri tree, String path, String range) {
        try {
            String doc = dec(path.substring(PREFIX.length()));
            Uri u = DocumentsContract.buildDocumentUriUsingTree(tree, doc);
            ContentResolver cr = c.getContentResolver();
            String mime = cr.getType(u);
            if (mime == null || mime.equals("application/octet-stream")) mime = "audio/mpeg";
            AssetFileDescriptor fd = cr.openAssetFileDescriptor(u, "r");
            if (fd == null) return null;
            long total = fd.getLength();
            long start = 0, end = total - 1;
            boolean part = false;
            if (range != null && range.startsWith("bytes=") && total > 0) {
                String[] p = range.substring(6).split("-", -1);
                try {
                    if (p[0].length() > 0) start = Long.parseLong(p[0]);
                    if (p.length > 1 && p[1].length() > 0) end = Long.parseLong(p[1]);
                    if (p[0].length() == 0 && p.length > 1 && p[1].length() > 0) {
                        start = Math.max(0, total - Long.parseLong(p[1]));
                        end = total - 1;
                    }
                    part = true;
                } catch (Exception e) {
                    start = 0;
                    end = total - 1;
                }
                if (end >= total) end = total - 1;
                if (start > end) start = 0;
            }
            FileInputStream fis = fd.createInputStream();
            if (start > 0) fis.getChannel().position(fd.getStartOffset() + start);
            long len = total > 0 ? end - start + 1 : -1;
            InputStream in = len >= 0 ? new Bounded(fis, len, fd) : fis;
            Map<String, String> h = new HashMap<String, String>();
            h.put("Accept-Ranges", "bytes");
            h.put("Access-Control-Allow-Origin", "*");
            if (total > 0) h.put("Content-Length", String.valueOf(len));
            if (part && total > 0) {
                h.put("Content-Range", "bytes " + start + "-" + end + "/" + total);
                return new WebResourceResponse(mime, null, 206, "Partial Content", h, in);
            }
            return new WebResourceResponse(mime, null, 200, "OK", h, in);
        } catch (Throwable e) {
            return null;
        }
    }

    static class Bounded extends InputStream {
        final InputStream in;
        final AssetFileDescriptor fd;
        long left;

        Bounded(InputStream in, long n, AssetFileDescriptor fd) {
            this.in = in;
            this.left = n;
            this.fd = fd;
        }

        @Override
        public int read() throws IOException {
            if (left <= 0) return -1;
            int b = in.read();
            if (b >= 0) left--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (left <= 0) return -1;
            int n = in.read(b, off, (int) Math.min(len, left));
            if (n > 0) left -= n;
            return n;
        }

        @Override
        public void close() throws IOException {
            try {
                in.close();
            } finally {
                try {
                    fd.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    static JSONObject itemJson(Item it, JSONObject m) throws Exception {
        JSONObject o = new JSONObject();
        o.put("doc", it.doc);
        o.put("p", PREFIX + enc(it.doc));
        o.put("name", it.name);
        o.put("size", it.size);
        o.put("mtime", it.mtime);
        if (m != null) {
            java.util.Iterator<String> k = m.keys();
            while (k.hasNext()) {
                String key = k.next();
                o.put(key, m.get(key));
            }
        }
        return o;
    }

    static JSONArray ids(ArrayList<Item> all) {
        JSONArray a = new JSONArray();
        for (Item it : all) a.put(it.doc);
        return a;
    }
}
