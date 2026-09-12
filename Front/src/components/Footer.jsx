import { Leaf, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#2a3a34] bg-[#0a0f0d] py-8 mt-auto w-full flex justify-center">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: "auto", marginRight: "auto" }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            <span className="font-[Outfit] font-bold text-white">
              Agro<span className="text-green-400">Intel</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-red-400" /> for Indian Farmers
          </p>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} AgroIntel. AI-Powered Agriculture.
          </p>
        </div>
      </div>
    </footer>
  );
}
