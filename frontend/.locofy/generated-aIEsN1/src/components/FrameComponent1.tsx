import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./FrameComponent1.module.css";

export type FrameComponent1Type = {
  className?: string;

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const FrameComponent1: FunctionComponent<FrameComponent1Type> = ({
  className = "",
  property1 = "Default",
}) => {
  return (
    <Box
      className={[styles.containerParent, className].join(" ")}
      data-property1={property1}
    >
      <Box className={styles.container}>
        <Box className={styles.container2}>
          <Box className={styles.divflex}>
            <Box className={styles.iconFilledType1}>
              <img className={styles.icon} alt="" src="/Icon.svg" />
            </Box>
            <Box className={styles.container3}>
              <Box className={styles.container4}>
                <img
                  className={styles.arrowIcon}
                  alt=""
                  src="/Arrow-Icon.svg"
                />
              </Box>
              <Box className={styles.container5}>
                <div className={styles.percentageText}>12.6% mês passado</div>
              </Box>
            </Box>
          </Box>
          <Box className={styles.container6}>
            <Box className={styles.divmt6}>
              <Box className={styles.ptextSm}>
                <div className={styles.title}>Receita total</div>
              </Box>
              <Box className={styles.pfontDisplay}>
                <div className={styles.value}>R$ 4,82M</div>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box className={styles.ptextXs}>
          <Box className={styles.container7}>
            <img className={styles.arrowIcon2} alt="" src="/Arrow-Icon1.svg" />
            <div className={styles.linkText}>Acessar mais detalhes</div>
          </Box>
        </Box>
      </Box>
      <Box className={styles.container8}>
        <Box className={styles.container9}>
          <Box className={styles.divflex2}>
            <Box className={styles.iconFilledType12}>
              <img className={styles.icon2} alt="" src="/Shopping-cart.svg" />
            </Box>
            <Box className={styles.container10}>
              <Box className={styles.container11}>
                <img
                  className={styles.arrowIcon3}
                  alt=""
                  src="/Arrow-Icon2.svg"
                />
              </Box>
              <Box className={styles.container12}>
                <div className={styles.percentageText2}>3.4% mês passado</div>
              </Box>
            </Box>
          </Box>
          <Box className={styles.container13}>
            <Box className={styles.divmt62}>
              <Box className={styles.ptextSm2}>
                <div className={styles.title2}>Pedidos</div>
              </Box>
              <Box className={styles.pfontDisplay2}>
                <div className={styles.value2}>1,45M</div>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box className={styles.ptextXs2}>
          <Box className={styles.container14}>
            <img className={styles.arrowIcon4} alt="" src="/Arrow-Icon1.svg" />
            <div className={styles.linkText2}>Acessar mais detalhes</div>
          </Box>
        </Box>
      </Box>
      <Box className={styles.container15}>
        <Box className={styles.container16}>
          <Box className={styles.divflex3}>
            <Box className={styles.iconFilledType13}>
              <img className={styles.icon3} alt="" src="/Icon1.svg" />
            </Box>
            <Box className={styles.container17}>
              <Box className={styles.container18}>
                <img
                  className={styles.arrowIcon5}
                  alt=""
                  src="/Arrow-Icon.svg"
                />
              </Box>
              <Box className={styles.container19}>
                <div className={styles.percentageText3}>12.6% mês passado</div>
              </Box>
            </Box>
          </Box>
          <Box className={styles.container20}>
            <Box className={styles.divmt63}>
              <Box className={styles.ptextSm3}>
                <div className={styles.title3}>CSTA Promotores</div>
              </Box>
              <Box className={styles.pfontDisplay3}>
                <div className={styles.value3}>70%</div>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box className={styles.ptextXs3}>
          <Box className={styles.container21}>
            <img className={styles.arrowIcon6} alt="" src="/Arrow-Icon1.svg" />
            <div className={styles.linkText3}>Acessar mais detalhes</div>
          </Box>
        </Box>
      </Box>
      <Box className={styles.container22}>
        <Box className={styles.container23}>
          <Box className={styles.divflex4}>
            <Box className={styles.iconFilledType14}>
              <img className={styles.icon4} alt="" src="/Users.svg" />
            </Box>
            <Box className={styles.container24}>
              <Box className={styles.container25}>
                <img
                  className={styles.arrowIcon7}
                  alt=""
                  src="/Arrow-Icon.svg"
                />
              </Box>
              <Box className={styles.container26}>
                <div className={styles.percentageText4}>12.6% mês passado</div>
              </Box>
            </Box>
          </Box>
          <Box className={styles.container27}>
            <Box className={styles.divmt64}>
              <Box className={styles.ptextSm4}>
                <div className={styles.title4}>Clientes Ativos</div>
              </Box>
              <Box className={styles.pfontDisplay4}>
                <div className={styles.value4}>50.859</div>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box className={styles.ptextXs4}>
          <Box className={styles.container28}>
            <img className={styles.arrowIcon8} alt="" src="/Arrow-Icon1.svg" />
            <div className={styles.linkText4}>Acessar mais detalhes</div>
          </Box>
        </Box>
      </Box>
      <Box className={styles.container29}>
        <Box className={styles.container30}>
          <Box className={styles.divflex5}>
            <Box className={styles.iconFilledType15}>
              <img className={styles.icon5} alt="" src="/Icon.svg" />
            </Box>
            <Box className={styles.container31}>
              <Box className={styles.container32}>
                <img
                  className={styles.arrowIcon9}
                  alt=""
                  src="/Arrow-Icon.svg"
                />
              </Box>
              <Box className={styles.container33}>
                <div className={styles.percentageText5}>12.6% mês passado</div>
              </Box>
            </Box>
          </Box>
          <Box className={styles.container34}>
            <Box className={styles.divmt65}>
              <Box className={styles.ptextSm5}>
                <div className={styles.title5}>Entregas no Prazo</div>
              </Box>
              <Box className={styles.pfontDisplay5}>
                <div className={styles.value5}>87,6%</div>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box className={styles.ptextXs5}>
          <Box className={styles.container35}>
            <img className={styles.arrowIcon10} alt="" src="/Arrow-Icon1.svg" />
            <div className={styles.linkText5}>Acessar mais detalhes</div>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FrameComponent1;
