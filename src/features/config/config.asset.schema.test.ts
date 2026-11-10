import { describe, expect, it } from "vitest";
import {
  SITE_ASSET_MAX_FILE_SIZE,
  SITE_ASSET_MAX_FILE_SIZE_MB,
  parseSiteAssetUploadInput,
} from "./config.asset.schema";
import { m } from "@/paraglide/messages";

function uploadForm(size: number, assetPath = "site/avatar.png") {
  const formData = new FormData();
  formData.set(
    "file",
    new File([new Uint8Array(size)], "avatar.png", { type: "image/png" }),
  );
  formData.set("assetPath", assetPath);
  return formData;
}

describe("parseSiteAssetUploadInput", () => {
  it("accepts a file at the size limit", () => {
    const parsed = parseSiteAssetUploadInput(
      uploadForm(SITE_ASSET_MAX_FILE_SIZE),
      m,
    );
    expect(parsed.assetPath).toBe("site/avatar.png");
  });

  it("still accepts the path used before images were shared by all Themes", () => {
    const parsed = parseSiteAssetUploadInput(
      uploadForm(1, "themes/fuwari/avatar.png"),
      m,
    );
    expect(parsed.assetPath).toBe("themes/fuwari/avatar.png");
  });

  it("refuses a path outside the site asset folders", () => {
    expect(() =>
      parseSiteAssetUploadInput(uploadForm(1, "posts/avatar.png"), m),
    ).toThrow();
  });

  it("names the enforced limit when a file is too large", () => {
    expect(() =>
      parseSiteAssetUploadInput(uploadForm(SITE_ASSET_MAX_FILE_SIZE + 1), m),
    ).toThrow(`${SITE_ASSET_MAX_FILE_SIZE_MB}MB`);
  });
});
