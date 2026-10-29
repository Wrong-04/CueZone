import { Card as AntCard, type CardProps as AntCardProps } from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type CardProps = AntCardProps;

type CompoundedCard = FC<CardProps> & {
  Grid: typeof AntCard.Grid;
  Meta: typeof AntCard.Meta;
};

export const Card: CompoundedCard = Object.assign(
  (({ className, ...props }: CardProps) => {
    return (
      <AntCard
        className={clsx("border-border-divider shadow-2xs rounded-lg", className)}
        {...props}
      />
    );
  }) as FC<CardProps>,
  {
    Grid: AntCard.Grid,
    Meta: AntCard.Meta,
  },
);
