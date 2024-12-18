'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";

const Logo = () => {
  const router = useRouter();

  return ( 
    <Image
    onClick={() => { window.location.href = "http://localhost:3000"; }}
      className="hidden md:block cursor-pointer" 
      src="/images/logo.png" 
      height="95" 
      width="95" 
      alt="Logo" 
    />
   );
}
 
export default Logo;
