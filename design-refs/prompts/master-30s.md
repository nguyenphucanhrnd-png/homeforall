# Master video: ~30 seconds, one continuous journey (for Gemini Omni 1.1 Flash or any video model that can extend scenes)

Which model? "Gemini 4 Argon" only outputs text (per Google's model page), so it cannot make the video.
Use a video model: Google's **Gemini Omni 1.1 Flash** (Flow, Gemini app scene extension, or AI Studio), which per Google's announcement
extends scenes in 10-second steps up to 40 s, accepts character images and first/last-frame control, and can upscale final outputs to 1080p or 4K.
Argon is useful for *refining these prompts* (paste a prompt and ask it to tighten it), not for rendering.
(I could not confirm which of these controls your plan exposes; check the Flow / AI Studio UI.)

## Workflow
1. Make character reference images first (`image-prompts.md`). Attach Miu and the dog as references in every step.
2. Render **Segment 1** (0–10 s) as a cheap draft if a draft/low-res mode exists; check motion and story; then render final.
3. **Extend** the same scene with Segment 2 (10–20 s), then Segment 3 (20–30 s). Always paste the GLOBAL BLOCK again.
4. Final quality: generate at the highest resolution offered, then upscale to 4K (in-product upscale if available, else see README "Nâng 4K").
5. Save the result as `design-refs/video/master.mp4`, fill `design-refs/video/master-timecodes.txt`, then follow `design-refs/README.md` (Windows: `python design-refs/scripts/hfa_media.py all`; for true 4K see section 4 there).
If a segment drifts (characters change, text appears), regenerate only that segment.

## GLOBAL BLOCK (paste at the start of every segment)
```
ONE continuous cinematic shot, no cuts, no scene changes by editing. Slow, smooth, physically plausible camera movement only
(push in, pull back, rise, glide, orbit). Scene transitions happen ONLY through the camera moving through space and through natural changes
of light and weather (clouds rolling in, dusk falling, a window the camera passes through).

World: a miniature claymorphism / plasticine stop-motion diorama of a Ho Chi Minh City alley neighbourhood: chunky rounded clay shapes with
subtle fingerprint texture, matte high-roughness material, soft studio lighting, shallow depth of field, tiny clay details (tin awnings, tangled wires,
potted plants, tiled roofs). 16:9, 24 fps. Palette: cream #FFF6EE, blue #3B8BD6, orange #F5822A, peach #FDD7B5, deep navy #0B1F33 at night.

Characters (identical in every shot, use the reference images):
- MIU: small orange tabby clay cat, darker orange stripes, white chest and white front paws, pink nose, large amber eyes, small round ears.
- DOG: golden-tan clay dog, floppy ears, dark nose, friendly open-mouth smile, cream chest patch.
- Humans: faceless clay figures with smooth rounded heads and NO facial features.

STRICT: no text, no letters, no numbers, no logos, no real brands, no watermarks, no photographs, no photorealistic animals,
no clear human faces, no injuries or distress, no gore. The animals look healthy and calm. Ambient sound only (soft rain, soft room tone), no music, no speech.
```

## SEGMENT 1 — seconds 0–10 (start the scene with this)
```
[GLOBAL BLOCK]

0.0–3.0 s  WARM DAY. A cosy clay cottage with an orange tiled roof, a heart-shaped window, a wooden door, two round green clay trees and small flowers,
on a small green diorama base against a soft cream background. DOG and MIU sit by the door, breathing gently; the dog's tail wags softly.
Camera starts close on the door and slowly pulls back and begins to rise.

3.0–5.0 s  The camera keeps rising over the clay rooftops. Soft clouds roll in, the light shifts from cream daylight through dusk to deep navy night,
a few raindrops start to fall. The camera tips down and begins descending toward a narrow alley between houses.

5.0–8.0 s  NIGHT ALLEY IN THE RAIN. Corrugated tin awning, tangled wires, a street lamp that flickers softly, wet pavement with small ripples.
MIU (alone, small, a little cold but not hurt) huddles under the awning beside a green bin. Cold navy and blue tones with one warm lamp glow.
Camera pushes in slowly at low angle.

8.0–10.0 s  A faceless clay volunteer figure enters from the right edge of frame carrying a small pet carrier box. As the figure steps forward,
glowing clay paw prints light up on the wet pavement one after another, leading toward Miu. The light begins to warm from blue toward orange.
```

## SEGMENT 2 — seconds 10–20 (extend)
```
[GLOBAL BLOCK]
CONTINUE seamlessly from the last frame of the previous clip. Same characters, same lighting, same camera motion direction.

10.0–11.0 s  The volunteer gently lifts MIU into the carrier; the paw prints keep glowing. The camera follows the paw prints along the alley.

11.0–14.0 s  CLINIC. The camera glides in through the open doorway of a bright blue clay veterinary clinic (exam table, cabinet with bottles,
a wall shield with a cross). MIU sits calmly on the table. Small clay badges (shield, medical cross, syringe, paw-print seal) pop up one by one and
float gently around Miu. Clean light blue palette. Camera orbits slowly about 30 degrees.

14.0–17.0 s  COSY FOSTER ROOM. The camera continues through an open doorway into a warm room in amber evening light: a round cushion bed
with a paw-print pattern, a tiny clay plant, a window with soft light. MIU sleeps curled up, chest rising and falling slowly. Camera dollies toward Miu's face.

17.0–20.0 s  CONNECTION. The camera drifts to the room's window and passes through it into a soft peach-pink dusk sky over the rooftops.
A gentle ribbon of tiny clay hearts and paw prints floats across the sky, linking roofs of nearby houses. NO photographs, no frames, no pictures in the ribbon.
```

## SEGMENT 3 — seconds 20–30 (extend)
```
[GLOBAL BLOCK]
CONTINUE seamlessly from the last frame of the previous clip. Same characters, same lighting.

20.0–23.5 s  HOME. The camera descends and glides to the gate of a clay house at dusk with warm lit windows. The wooden front door opens inward,
releasing warm golden light. Faceless clay family silhouettes (adult, adult, child) wait inside. MIU walks up the stone steps and into the doorway.
Small lantern by the door, flower pots. Camera settles in front of the door.

23.5–26.5 s  THE NEXT MORNING. Soft time-lapse: the light turns to gentle morning. Inside the house the camera glides sideways across a windowsill where
MIU sits in warm sunlight. On the wall, a clay calendar with three small hearts lights up one after another (no numbers or text). A small clay houseplant sways.

26.5–30.0 s  NETWORK. The camera passes through the window outward and rises smoothly, pulling back over the neighbourhood as the sky turns from morning to warm dusk.
Dozens of clay houses with lit windows spread below; thin glowing golden lines connect the houses one by one into a network. Navy sky fading to warm gold.
End on a wide, calm, symmetrical view of the whole neighbourhood.
```

## If your tool cannot extend scenes
Use "first frame / last frame" control: generate each of the 9 scenes separately (use the SEGMENT text for that time range), start each from the previous scene's last frame.

## Quality checklist (each segment)
- [ ] Miu keeps the same colouring, stripes and white chest across the whole run
- [ ] No text, logos, numbers or photographs anywhere (especially the calendar and the sky ribbon)
- [ ] Humans have no facial features; no injuries or distress
- [ ] Camera never cuts; transitions are physical moves and light changes
- [ ] Each scene reads clearly for at least ~3 s (we need that for scroll scrubbing)

## Lessons from master #1 (apply when re-generating; fixes in bold)
Measured on the first 30 s master (1280x720, with Gemini sparkle, with audio, 24 fps):
- It worked: all nine scenes appear in order, Miu stays consistent, clay look is strong, no text or photos.
- **Resolution:** it came out 720p. Ask for the highest export offered, then upscale (README section 4).
- **Ghosted dissolve at ~24 s** (door scene cross-fades into the windowsill with both visible). Add to Segment 3 at 23.5: *"Transition by the camera physically turning from the doorway to a window inside, never by cross-fading or double exposure."*
- **Network scene is weak (faint arcs, only ~1.2 s clean).** Replace the last 3.5 s in Segment 3 with: *"26.5-30.0 s: wide aerial view held for the full 3.5 s, no window in frame. Starting from small dim lights, five clearly different glowing nodes (a house, a clinic with blue roof, a heart-shaped cottage, a cottage with a green door, a lantern) each light up in turn, and thick warm golden lines draw between them across the whole frame. Hold the final connected network for 1.5 s."*
- **Give each scene at least 3 s** (the foster and home-door scenes got only ~2 s). Shorten the first 3 s hero and the connection ribbon instead.
- Keep: "no text, numbers or photographs"; faceless humans; the sparkle logo is added by the tool and removed afterwards by `hfa_media.py`.
