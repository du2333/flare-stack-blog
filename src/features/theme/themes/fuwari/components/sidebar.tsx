import { Profile } from "./profile";
import { Tags } from "./tags";

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-4">
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "100ms" }}
      >
        <Profile />
      </div>
      <div
        className="sticky top-24 fuwari-onload-animation"
        style={{ animationDelay: "150ms" }}
      >
        <Tags />
      </div>
    </aside>
  );
}
