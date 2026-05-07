import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import ButtonLarge from "./ButtonLarge";
import styles from "./ButtonIA.module.css";

export type ButtonIAType = {
  className?: string;

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const ButtonIA: FunctionComponent<ButtonIAType> = ({
  className = "",
  property1 = "Default",
}) => {
  return (
    <Box
      className={[styles.buttonIa, className].join(" ")}
      data-property1={property1}
    >
      <ButtonLarge
        color="Blue"
        state="Motion"
        type="AI"
        rightIcon={false}
        leftIcon
      />
    </Box>
  );
};

export default ButtonIA;
