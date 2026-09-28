import jpeg from "jpeg-js";
import {
  validateKycDocument,
  validateSelfiePhoto,
  validateProfilePhoto,
  detectFaceInImage,
  compareFaces,
} from "./utils/image-validator";

function createDetailedJpeg(
  width: number,
  height: number,
  pixelGenerator: (x: number, y: number) => [number, number, number]
): Buffer {
  const frameData = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelGenerator(x, y);
      const idx = (y * width + x) * 4;
      const noise = ((x * 17 + y * 23) % 7) - 3;
      frameData[idx] = Math.max(0, Math.min(255, r + noise));
      frameData[idx + 1] = Math.max(0, Math.min(255, g + noise));
      frameData[idx + 2] = Math.max(0, Math.min(255, b + noise));
      frameData[idx + 3] = 255;
    }
  }
  const rawImageData = { data: frameData, width, height };
  const jpegImageData = jpeg.encode(rawImageData, 92);
  return jpegImageData.data;
}

async function runTests() {
  console.log("=== Testing Real Pixel Face Detection, Face Matching & OCR Validation ===");

  // 1. Unrelated Blue Backpack (600x600, ~40KB, 0% skin, 0% face)
  const blueBagJpeg = createDetailedJpeg(600, 600, (x, y) => [20, 60, 190]);
  const bagFaceCheck = detectFaceInImage(blueBagJpeg);
  console.log("1. Blue Backpack Face Detection:", bagFaceCheck.hasFace, "-", bagFaceCheck.reason);
  const bagSelfie = validateSelfiePhoto(blueBagJpeg, "bag.jpg");
  console.log("   Selfie Rejection:", !bagSelfie.isValid, "-", bagSelfie.error);

  // 2. Verified Human Face Selfie (Person A)
  const personASelfieJpeg = createDetailedJpeg(600, 600, (x, y) => {
    const dx = (x - 300) / 160;
    const dy = (y - 300) / 200;
    const distSq = dx * dx + dy * dy;

    const isLeftEye = Math.hypot(x - 230, y - 240) < 22;
    const isRightEye = Math.hypot(x - 370, y - 240) < 22;
    const isMouth = Math.abs(x - 300) < 45 && Math.abs(y - 390) < 14;

    if (distSq < 1.0) {
      if (isLeftEye || isRightEye) return [25, 25, 25];
      if (isMouth) return [190, 60, 70];
      return [228, 178, 142]; // Skin tone A
    }
    return [245, 245, 245];
  });
  const faceSelfie = validateSelfiePhoto(personASelfieJpeg, "selfie.jpg");
  console.log("2. Real Human Face Selfie validation:", faceSelfie.isValid, faceSelfie.metadata);

  // 3. Matching Main Profile Photo (Same Person A, Same location, isPrimary: true)
  const personAProfilePhoto = createDetailedJpeg(600, 600, (x, y) => {
    const dx = (x - 300) / 155;
    const dy = (y - 300) / 195;
    const distSq = dx * dx + dy * dy;

    const isLeftEye = Math.hypot(x - 230, y - 240) < 20;
    const isRightEye = Math.hypot(x - 370, y - 240) < 20;
    const isMouth = Math.abs(x - 300) < 45 && Math.abs(y - 390) < 14;

    if (distSq < 1.0) {
      if (isLeftEye || isRightEye) return [20, 20, 20];
      if (isMouth) return [185, 55, 65];
      return [226, 176, 140]; // Same Skin tone A
    }
    return [230, 230, 230];
  });
  const samePersonMatch = compareFaces(personASelfieJpeg, personAProfilePhoto);
  console.log("3. Same Person Face Match Result:", samePersonMatch.isMatch, "Similarity:", samePersonMatch.similarity);
  const profileValidationSame = validateProfilePhoto(personAProfilePhoto, "profile.jpg", personASelfieJpeg, true);
  console.log("   Main Profile Photo (Same location) Approval:", profileValidationSame.isValid);

  // 3b. Matching Main Profile Photo (Same Person A in different location / outdoor lighting, isPrimary: true)
  const personAOutdoorPhoto = createDetailedJpeg(600, 600, (x, y) => {
    const dx = (x - 300) / 145;
    const dy = (y - 300) / 185;
    const distSq = dx * dx + dy * dy;

    const isLeftEye = Math.hypot(x - 235, y - 245) < 18;
    const isRightEye = Math.hypot(x - 365, y - 245) < 18;
    const isMouth = Math.abs(x - 300) < 40 && Math.abs(y - 385) < 14;

    if (distSq < 1.0) {
      if (isLeftEye || isRightEye) return [30, 30, 30];
      if (isMouth) return [205, 70, 80];
      return [245, 195, 155]; // Same Person A in bright sunlight (+20 brightness, slight sunlight shift)
    }
    return [100, 180, 240]; // Outdoor blue sky background
  });
  const outdoorMatch = compareFaces(personASelfieJpeg, personAOutdoorPhoto);
  console.log("3b. Same Person Different Location Match:", outdoorMatch.isMatch, "Similarity:", outdoorMatch.similarity);
  const outdoorValidation = validateProfilePhoto(personAOutdoorPhoto, "outdoor.jpg", personASelfieJpeg, true);
  console.log("    Different Location Profile Photo Approval:", outdoorValidation.isValid);


  // 4. Mismatched Main Profile Photo (Backpack uploaded as Main Profile Photo, isPrimary: true)
  const profileValidationBagPrimary = validateProfilePhoto(blueBagJpeg, "profile.jpg", personASelfieJpeg, true);
  console.log("4. Bag as Main Profile (isPrimary=true) Rejection:", !profileValidationBagPrimary.isValid, "-", profileValidationBagPrimary.error);

  // 5. Different Person Face Mismatch (Person B with different facial geometry & skin tone, isPrimary: true)
  const personBProfilePhoto = createDetailedJpeg(600, 600, (x, y) => {
    const dx = (x - 300) / 220; // Much wider face
    const dy = (y - 300) / 140; // Shorter face (aspect ratio ~1.57 vs ~0.8)
    const distSq = dx * dx + dy * dy;

    const isLeftEye = Math.hypot(x - 200, y - 270) < 18;
    const isRightEye = Math.hypot(x - 400, y - 270) < 18;
    const isMouth = Math.abs(x - 300) < 55 && Math.abs(y - 350) < 12;

    if (distSq < 1.0) {
      if (isLeftEye || isRightEye) return [10, 10, 10];
      if (isMouth) return [150, 40, 50];
      return [180, 120, 170]; // Distinct Person B skin tone (very different Cb/Cr)
    }
    return [230, 230, 230];
  });
  const diffPersonMatch = compareFaces(personASelfieJpeg, personBProfilePhoto);
  console.log("5. Different Person Face Match Result:", diffPersonMatch.isMatch, "Similarity:", diffPersonMatch.similarity, "-", diffPersonMatch.error);
  const diffPersonProfileValidation = validateProfilePhoto(personBProfilePhoto, "profile_diff.jpg", personASelfieJpeg, true);
  console.log("   Different Person Main Profile Photo Rejection:", !diffPersonProfileValidation.isValid, "-", diffPersonProfileValidation.error);

  // 6. Remaining Photos (Backpack/Scenery uploaded as Remaining Photo Slot 1-3, isPrimary: false)
  const remainingPhotoBag = validateProfilePhoto(blueBagJpeg, "hobby.jpg", personASelfieJpeg, false);
  console.log("6. Bag as Remaining Photo (isPrimary=false) Approval:", remainingPhotoBag.isValid, "(Allowed for lifestyle/hobby photos)");

  console.log("=== Validation & Face Matching Tests Complete! ===");
  process.exit(0);

}

runTests().catch(console.error);


