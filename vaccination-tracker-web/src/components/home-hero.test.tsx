import { render, screen } from "@testing-library/react";
import { HomeHero } from "@/components/home-hero";

describe("HomeHero", () => {
  it("renders the app heading and API health link", () => {
    render(<HomeHero />);

    expect(
      screen.getByRole("heading", {
        name: /vaccination records, reminders, and schedules/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /check api health/i,
      }),
    ).toHaveAttribute("href", "http://localhost:3001/api/v1/health");
  });
});
