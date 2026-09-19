package com.linkme.api.uploads;

import com.linkme.api.common.ApiException;
import com.linkme.api.config.AppProperties;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Stockage local des images (développement, ou production sans Cloudinary). Type vérifié par signature binaire. */
@Service
public class LocalMediaService {
    private final Path dir;
    private final boolean enabled;
    private final long maxBytes;

    public record Stored(String fileName, String format, Integer width, Integer height, int bytes, String placeholder) {}

    public LocalMediaService(AppProperties props) {
        this.dir = Path.of(props.media().dir()).toAbsolutePath().normalize();
        this.enabled = props.media().localUploadsEnabled();
        this.maxBytes = props.media().maxBytes();
    }

    public boolean enabled() {
        return enabled;
    }

    public Path dir() {
        return dir;
    }

    public Stored store(byte[] data) {
        if (!enabled) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "UPLOAD_UNAVAILABLE", "Upload local désactivé.");
        if (data.length == 0) throw ApiException.badRequest("UPLOAD_TYPE", "Fichier vide.");
        if (data.length > maxBytes) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "UPLOAD_TOO_LARGE", "Image trop lourde (8 Mo maximum).");
        String format = sniff(data);
        if (format == null) throw ApiException.badRequest("UPLOAD_TYPE", "Format non supporté (JPEG, PNG ou WebP).");
        Integer w = null;
        Integer h = null;
        String placeholder = null;
        if (!"webp".equals(format)) {
            try {
                BufferedImage img = ImageIO.read(new ByteArrayInputStream(data));
                if (img == null) throw ApiException.badRequest("UPLOAD_TYPE", "Image illisible.");
                w = img.getWidth();
                h = img.getHeight();
                placeholder = averageColor(img);
            } catch (IOException e) {
                throw ApiException.badRequest("UPLOAD_TYPE", "Image illisible.");
            }
        }
        String name = UUID.randomUUID() + "." + format;
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(name).normalize();
            if (!target.startsWith(dir)) throw new IllegalStateException("path traversal");
            Files.write(target, data);
        } catch (IOException e) {
            throw new IllegalStateException("Écriture impossible", e);
        }
        return new Stored(name, format, w, h, data.length, placeholder);
    }

    /** Détection par « magic bytes » (on ignore le Content-Type déclaré par le client). */
    public static String sniff(byte[] d) {
        if (d.length >= 3 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) return "jpg";
        if (d.length >= 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') return "png";
        if (d.length >= 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F' && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P') return "webp";
        return null;
    }

    static String averageColor(BufferedImage img) {
        long r = 0;
        long g = 0;
        long b = 0;
        int n = 0;
        int stepX = Math.max(1, img.getWidth() / 16);
        int stepY = Math.max(1, img.getHeight() / 16);
        for (int y = 0; y < img.getHeight(); y += stepY) {
            for (int x = 0; x < img.getWidth(); x += stepX) {
                int rgb = img.getRGB(x, y);
                r += (rgb >> 16) & 0xFF;
                g += (rgb >> 8) & 0xFF;
                b += rgb & 0xFF;
                n++;
            }
        }
        return n == 0 ? null : String.format("#%02X%02X%02X", r / n, g / n, b / n);
    }
}
