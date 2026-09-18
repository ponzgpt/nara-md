// "/" is both the product and its landing page: the search is the hero, the story sits below it.
import { Home } from "@/components/Home";
import { Marketing } from "@/components/Marketing";

export default function Page() {
  return <Home><Marketing /></Home>;
}
