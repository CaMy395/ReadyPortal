import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import AdminEmailCampaign from "./AdminEmailCampaign";

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  axios.get.mockImplementation(async (url) => {
    if (url.endsWith("audience")) return { data: { email: 3, sms: 2 } };
    if (url.endsWith("log")) return { data: { entries: [], sent: 0, failed: 0 } };
    return { data: { campaigns: [] } };
  });
});

test("reviews and sends an email, reporting partial provider failure", async () => {
  axios.post.mockResolvedValue({ data: { attempted: 3, sent: 2, failed: 1 } });
  render(<AdminEmailCampaign />);
  await screen.findByText("3");
  fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Summer events" } });
  fireEvent.change(screen.getByLabelText("Email message"), { target: { value: "New dates are open." } });
  fireEvent.click(screen.getByRole("button", { name: "Review campaign" }));
  expect(axios.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Send email" }));
  await screen.findByText("2 accepted by the provider · 1 failed");
  expect(axios.post.mock.calls[0][0]).toMatch(/\/api\/send-campaign$/);
  expect(axios.post.mock.calls[0][1].get("subject")).toBe("Summer events");
});

test("sends an independent SMS draft without email fields", async () => {
  axios.post.mockResolvedValue({ data: { attempted: 2, sent: 2, failed: 0 } });
  render(<AdminEmailCampaign />);
  await screen.findByText("2");
  fireEvent.change(screen.getByLabelText("Email message"), { target: { value: "Email draft" } });
  fireEvent.click(screen.getByRole("button", { name: "SMS" }));
  expect(screen.getByLabelText("Text message").value).toBe("");
  fireEvent.change(screen.getByLabelText("Text message"), { target: { value: "Text draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Review campaign" }));
  fireEvent.click(screen.getByRole("button", { name: "Send SMS" }));
  await screen.findByText("2 accepted by the provider · 0 failed");
  expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/api\/send-sms-campaign$/), { message: "Text draft" });
});

test("blocks immediate sends to an empty audience and still allows scheduling", async () => {
  axios.get.mockResolvedValueOnce({ data: { email: 0, sms: 0 } });
  axios.post.mockResolvedValue({ data: { ok: true } });
  render(<AdminEmailCampaign />);
  await screen.findByText("No clients are eligible for email yet.");
  fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Summer events" } });
  fireEvent.change(screen.getByLabelText("Email message"), { target: { value: "New dates are open." } });
  expect(screen.getByRole("button", { name: "Review campaign" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Send timing"), { target: { value: "later" } });
  fireEvent.change(screen.getByLabelText("Send date and time (Eastern)"), {
    target: { value: "2030-06-04T13:15" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review campaign" }));
  fireEvent.click(screen.getByRole("button", { name: "Schedule email" }));
  await screen.findByText("Email campaign scheduled.");
  await waitFor(() => expect(axios.get.mock.calls.filter(([url]) => url.endsWith("scheduled-campaigns"))).toHaveLength(2));
  expect(axios.post.mock.calls[0][1].get("scheduledSendAt")).toBe("2030-06-04 13:15:00");
});
