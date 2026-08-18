import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import { UploadDropzone } from "./UploadDropzone";
import { uploadMedia } from "./scrapbook-api";

vi.mock("./scrapbook-api", () => ({ uploadMedia: vi.fn() }));

describe("UploadDropzone", () => {
  it("accepts QuickTime files and reports duplicate uploads while continuing", async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    const onError = vi.fn();
    vi.mocked(uploadMedia)
      .mockRejectedValueOnce(new ApiError(409, "This file already exists in the scrapbook", "DUPLICATE_MEDIA"))
      .mockResolvedValueOnce({ media: { id: "media-2" } as never });

    render(<UploadDropzone scrapbookId="scrapbook-1" albumId={null} onUploaded={onUploaded} onError={onError} />);
    const input = screen.getByLabelText("Choose files") as HTMLInputElement;
    await user.upload(input, [
      new File(["movie"], "memory.mov", { type: "video/quicktime" }),
      new File(["photo"], "new.jpeg", { type: "image/jpeg" }),
    ]);

    expect(uploadMedia).toHaveBeenCalledTimes(2);
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("memory.mov is already in this scrapbook"));
  });
});
