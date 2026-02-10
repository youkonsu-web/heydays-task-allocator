import { redirect } from "next/navigation";

export default function Home() {
  // 기본 워크스페이스로 바로 진입 (원하면 이름 바꿔도 됨)
  redirect("/w/heydays");
}
