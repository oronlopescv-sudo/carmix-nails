import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como os seus dados pessoais são tratados na marcação online.",
};

const UPDATE = new Date("2026-10-01");

export default async function PoliticaPage() {
  const s = await getSettings();
  return (
    <div className="prose-carmix mx-auto max-w-3xl px-4 pb-20 pt-12 text-[15px] text-tinta-soft sm:px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Privacidade</p>
        <h1 className="mt-2 font-display text-4xl text-bordo">Política de privacidade</h1>
        <p className="mt-2 text-[13px]">Última atualização: 1 de outubro de 2026</p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-xl text-bordo">1. Quem somos</h2>
        <p>
          {s.brandName} ({s.ownerName}){s.address ? `, ${s.address}` : ""}
          {s.city ? `, ${s.city}` : ""}.
          Contacto para questões sobre privacidade: {s.email || s.phone || "os contactos na página de contactos"}.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">2. Que dados recolhemos</h2>
        <p>
          Ao marcar uma hora recolhemos apenas: nome, número de telefone, e-mail
          (opcional), observações que escrever e os dados da marcação (serviço, data e
          hora). Sem estes dados não é possível garantir a sua marcação.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">3. Para que usamos</h2>
        <ul className="list-disc pl-6">
          <li>Gerir e confirmar a sua marcação;</li>
          <li>Enviar e-mails sobre a marcação (criação, confirmação, alteração ou cancelamento);</li>
          <li>Contactá-lo sobre a marcação, por telefone ou WhatsApp, se necessário;</li>
          <li>Histórico interno de marcações, para melhorar a organização do estúdio.</li>
        </ul>

        <h2 className="mt-6 font-display text-xl text-bordo">4. Fundamento e minimização</h2>
        <p>
          Tratamos os dados com o seu consentimento (art. 6.º, n.º 1, a) RGPD) e para
          executar a marcação combinada. Recolhemos só o necessário — minimização de
          dados — e não usamos os seus dados para marketing automático.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">5. Conservação</h2>
        <p>
          Guardamos os dados das marcações enquanto forem úteis para a relação com o
          estúdio e pelo prazo legal aplicável. Pode pedir a eliminação ou correção a
          qualquer momento através dos contactos acima.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">6. Partilha</h2>
        <p>
          Não vendemos dados. Usamos fornecedores de envio de e-mail (Resend) e de
          alojamento; estes tratam apenas o necessário para cada serviço, com
          obrigações contratuais. Não partilhamos dados com terceiros comerciais.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">7. Os seus direitos</h2>
        <p>
          Pode pedir acesso, correção, eliminação, limitação ou portabilidade dos seus
          dados, e retirar o consentimento, contactando-nos. Tem também o direito de
          reclamar junto da autoridade de proteção de dados da sua jurisdição.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">8. Segurança</h2>
        <p>
          O site usa HTTPS, palavras-passe com hash seguro no painel, limites contra
          tentativas abusivas e registos de auditoria para ações administrativas. Os
          dados dos clientes não são expostos a outros visitantes.
        </p>
      </div>
    </div>
  );
}