import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  // Sonner has no onClick prop, so we wrap it and delegate clicks on any
  // toast card up to `toast.dismiss(id)` — click anywhere to close instantly.
  const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = (e.target as HTMLElement).closest("[data-sonner-toast]") as HTMLElement | null;
    if (!el) return;
    const id = el.getAttribute("data-id");
    if (id) toast.dismiss(id); else toast.dismiss();
  };
  return (
    <div onClick={handleClick}>
      <Sonner
        className="toaster group"
        position="top-right"
        duration={3500}
        toastOptions={{
          closeButton: true,
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg cursor-pointer",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
        {...props}
      />
    </div>
  );
};

export { Toaster };
