type ContainerProps = React.HTMLAttributes<HTMLDivElement>;

export function Container({ className = "", ...props }: ContainerProps) {
  return <div className={`mx-auto w-full max-w-6xl px-6 lg:px-8 ${className}`.trim()} {...props} />;
}
