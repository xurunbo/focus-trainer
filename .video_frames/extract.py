import cv2
import os
import sys

video_path = r"c:\Users\93513\.trae-cn\attachments\e772a467-597a-47d1-a790-3b9e67bc1fc7_573cb1a7-d88a-4644-84a1-b319f966498b_a3261115e9f8f368a4287ebd95e83038.mp4"
out_dir = r"C:\Temp\video_frames"
os.makedirs(out_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("ERROR: cannot open video")
    sys.exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = frames / fps if fps else 0
print(f"fps={fps:.2f}, frames={frames:.0f}, size={w}x{h}, duration={duration:.1f}s")

interval = max(1, int(round(fps * 2)))
saved = 0
failed = 0
idx = 0
while True:
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx * interval)
    ok, frame = cap.read()
    if not ok:
        break
    t = idx * interval / fps
    name = os.path.join(out_dir, f"frame_{idx:04d}_{t:06.1f}s.png")
    ok2, buf = cv2.imencode(".png", frame)
    if not ok2:
        failed += 1
    else:
        with open(name, "wb") as f:
            f.write(buf.tobytes())
        saved += 1
    idx += 1
    if idx * interval > frames:
        break

cap.release()
print(f"saved={saved} failed={failed} to {out_dir}")
