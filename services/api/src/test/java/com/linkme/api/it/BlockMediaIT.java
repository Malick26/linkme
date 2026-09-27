package com.linkme.api.it;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Blocs « sons »/« voyages » (D50) : image de fond par bloc, upload de son (alternative à un lien), embeds
 * Deezer/TikTok. Upload local (Cloudinary non configuré en test, comme le reste de la suite).
 */
class BlockMediaIT extends AbstractIT {

    private static final byte[] MP3_BYTES = "ID3".concat("\u0000".repeat(64)).getBytes(StandardCharsets.ISO_8859_1);
    private static final byte[] BOGUS_BYTES = {0x00, 0x01, 0x02, 0x03};

    private String createBlock(MockHttpSession s, String type) throws Exception {
        JsonNode b = body(mvc.perform(post("/api/me/blocks").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("type", type, "title", "Mes sons", "visible", true))))
                .andExpect(status().isCreated()).andReturn());
        return b.get("id").asText();
    }

    @Test
    void imageDeFondSurUnBlocEtSonUploadeSurUnItem() throws Exception {
        MockHttpSession s = register(uniqueHandle("media"));
        String blockId = createBlock(s, "music");

        // upload local d'une image de fond pour le bloc
        MvcResult bgUpload = mvc.perform(multipart("/api/me/uploads/local")
                        .file(new MockMultipartFile("file", "bg.png", "image/png", pngBytes()))
                        .param("kind", "background")
                        .session(s).with(csrf()))
                .andExpect(status().isCreated()).andReturn();
        String bgImageId = body(bgUpload).get("id").asText();

        JsonNode updated = body(mvc.perform(put("/api/me/blocks/" + blockId).session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("type", "music", "title", "Mes sons", "visible", true, "backgroundImageId", bgImageId))))
                .andExpect(status().isOk()).andReturn());
        org.junit.jupiter.api.Assertions.assertEquals(bgImageId, updated.get("backgroundImageId").asText());
        org.junit.jupiter.api.Assertions.assertTrue(updated.get("backgroundImage").get("url").asText().length() > 0);

        // upload local d'un son pour un item de ce bloc
        MvcResult soundUpload = mvc.perform(multipart("/api/me/uploads/local-audio")
                        .file(new MockMultipartFile("file", "track.mp3", "audio/mpeg", MP3_BYTES))
                        .session(s).with(csrf()))
                .andExpect(status().isCreated()).andReturn();
        JsonNode sound = body(soundUpload);
        String soundId = sound.get("id").asText();
        org.junit.jupiter.api.Assertions.assertEquals("mp3", sound.get("format").asText());

        JsonNode item = body(mvc.perform(post("/api/me/blocks/" + blockId + "/items").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Mon dernier morceau", "soundId", soundId))))
                .andExpect(status().isCreated()).andReturn());
        org.junit.jupiter.api.Assertions.assertEquals(soundId, item.get("soundId").asText());
        org.junit.jupiter.api.Assertions.assertTrue(item.get("sound").get("url").asText().contains(soundId) || item.get("sound").get("url").asText().length() > 0);
    }

    @Test
    void refuseUnSonDansUnFormatNonSupporte() throws Exception {
        MockHttpSession s = register(uniqueHandle("media2"));
        mvc.perform(multipart("/api/me/uploads/local-audio")
                        .file(new MockMultipartFile("file", "x.bin", "application/octet-stream", BOGUS_BYTES))
                        .session(s).with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("UPLOAD_TYPE"));
    }

    @Test
    void resoutLesEmbedsDeezerEtTiktok() throws Exception {
        MockHttpSession s = register(uniqueHandle("media3"));
        String blockId = createBlock(s, "music");

        JsonNode deezerItem = body(mvc.perform(post("/api/me/blocks/" + blockId + "/items").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Un titre Deezer", "url", "https://www.deezer.com/fr/track/1234567"))))
                .andExpect(status().isCreated()).andReturn());
        org.junit.jupiter.api.Assertions.assertEquals("deezer", deezerItem.get("embed").get("provider").asText());
        org.junit.jupiter.api.Assertions.assertEquals("https://widget.deezer.com/widget/dark/track/1234567", deezerItem.get("embed").get("src").asText());

        String travelBlockId = createBlock(s, "travel");
        JsonNode tiktokItem = body(mvc.perform(post("/api/me/blocks/" + travelBlockId + "/items").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Une vidéo TikTok", "url", "https://www.tiktok.com/@quelqu.un/video/7123456789012345678"))))
                .andExpect(status().isCreated()).andReturn());
        org.junit.jupiter.api.Assertions.assertEquals("tiktok", tiktokItem.get("embed").get("provider").asText());
        org.junit.jupiter.api.Assertions.assertEquals("https://www.tiktok.com/embed/v2/7123456789012345678", tiktokItem.get("embed").get("src").asText());
    }

    /** PNG 1×1 valide (généré via ImageIO, pas de bytes bricolés à la main), pour l'upload local d'image de fond. */
    private static byte[] pngBytes() throws Exception {
        BufferedImage img = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        img.setRGB(0, 0, 0xFF00FF);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }
}
