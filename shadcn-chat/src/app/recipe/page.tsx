import { RecipeWizard } from "@/components/recipe";

export const metadata = {
  title: "Recipe Builder - Spild Spotter",
  description: "Build recipes based on clearance items at your local supermarket",
};

export default function RecipePage() {
  return <RecipeWizard />;
}
